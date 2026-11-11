import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { withAIQuota } from '../middleware/quotaGuard';
import { routeRequest, AIRequest } from '../lib/ai/router';
import { consumeUserQuota } from '../lib/ai/quota';
import { supabaseAdmin, supabaseAsUser } from '../lib/supabase';
import { calculateNextReview, Rating } from '../lib/utils/sm2';

export function extractFlashcardsFromSlides(slides: { raw_text?: string; explanation?: string; slide_number?: number }[]): { front: string; back: string }[] {
  const cards: { front: string; back: string }[] = [];
  const seenFronts = new Set<string>();

  for (const s of slides) {
    const text = (s.raw_text || '').trim();
    const explanation = (s.explanation || '').trim();
    if (!text && !explanation) continue;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      const defMatch = line.match(/^([A-Z0-9\s/_-]{3,40})\s*[:–—]\s*(.{15,})$/);
      if (defMatch) {
        const front = `What is ${defMatch[1].trim()}?`;
        const back = defMatch[2].trim();
        if (!seenFronts.has(front.toLowerCase())) {
          seenFronts.add(front.toLowerCase());
          cards.push({ front, back });
        }
      }
    }

    for (let i = 0; i < lines.length - 1; i++) {
      const current = lines[i];
      const next = lines[i + 1];
      if (
        current.length >= 3 &&
        current.length <= 40 &&
        !current.endsWith('.') &&
        next.length >= 20 &&
        !next.startsWith('BSIT') &&
        !next.startsWith('Department')
      ) {
        const front = `Define ${current}`;
        const back = next;
        if (!seenFronts.has(front.toLowerCase()) && cards.length < 20) {
          seenFronts.add(front.toLowerCase());
          cards.push({ front, back });
        }
      }
    }

    if (explanation && explanation.length > 25 && lines.length > 0) {
      const heading = lines.find(l => l.length > 4 && l.length < 60 && !l.includes('•') && !l.startsWith('Department')) || `Slide ${s.slide_number} Concept`;
      const front = `Key concept: ${heading}`;
      const back = explanation.length > 250 ? explanation.slice(0, 250) + '...' : explanation;
      if (!seenFronts.has(front.toLowerCase()) && cards.length < 20) {
        seenFronts.add(front.toLowerCase());
        cards.push({ front, back });
      }
    }
  }

  return cards.slice(0, 15);
}

const router = Router();
router.use(authenticateUser);

// Generate flashcards using AI
router.post('/generate', withAIQuota('flashcard_generation'), async (req: Request, res: Response) => {
  const { lectureId } = req.body;

  if (!lectureId) {
    return res.status(400).json({ error: 'lectureId is required' });
  }

  try {
    // 1. Fetch all slides for the lecture
    const supabase = supabaseAsUser(req.user!.jwt);
    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('raw_text, explanation, slide_number')
      .eq('lecture_id', lectureId)
      .order('slide_number', { ascending: true });

    if (slidesError) throw slidesError;
    if (!slides || slides.length === 0) {
      return res.status(400).json({ error: 'No slides found for this lecture. Ensure the file was processed completely.' });
    }

    // 2. Combine all text for the prompt
    let combinedText = '';
    slides.forEach(s => {
      combinedText += `\n\n--- Slide ${s.slide_number} ---\nText: ${s.raw_text || ''}\nExplanation: ${s.explanation || ''}`;
    });

    if (combinedText.trim().length < 20) {
      const { data: lec } = await supabase.from('lectures').select('title').eq('id', lectureId).single();
      if (lec?.title) {
        combinedText += `\nLecture Title: ${lec.title}`;
      }
    }

    // 3. Request AI generation with graceful fallback
    let generatedCards: { front: string; back: string }[] = [];

    try {
      const aiReq: AIRequest = {
        task: 'batch_text',
        feature: 'flashcard_generation',
        payload: { prompt: combinedText },
        userId: req.user!.id,
        priority: 'medium',
        identifiers: [lectureId] // Cache per lecture
      };

      const response = await routeRequest(aiReq);

      console.log(`[Flashcards] Provider: ${response.provider}, responseMs: ${response.responseMs}ms`)
      
      consumeUserQuota(aiReq.userId, aiReq.feature, req.body?.model_tier || req.headers?.['x-model-tier'] || 'default').catch(console.error);
      
      // Parse result robustly (array, JSON string, or object with array property)
      let rawResult = response.result;
      if (typeof rawResult === 'string') {
        try {
          const cleaned = rawResult.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          rawResult = JSON.parse(cleaned);
        } catch (e) {
          console.error('Failed to parse flashcards JSON string:', e, rawResult);
        }
      }

      let extractedList: any[] = [];
      if (Array.isArray(rawResult)) {
        extractedList = rawResult;
      } else if (rawResult && typeof rawResult === 'object') {
        const possibleArray = Object.values(rawResult).find(v => Array.isArray(v));
        if (Array.isArray(possibleArray)) {
          extractedList = possibleArray;
        }
      }

      generatedCards = extractedList
        .map((c: any) => ({
          front: String(c.front || c.question || c.term || c.concept || c.q || '').trim(),
          back: String(c.back || c.answer || c.definition || c.explanation || c.a || '').trim()
        }))
        .filter(c => c.front.length > 0 && c.back.length > 0);
    } catch (aiErr: any) {
      console.warn('[Flashcards] AI generation failed, falling back to deterministic extraction:', aiErr?.message || aiErr);
    }

    // If AI failed or returned zero cards, extract directly from slides
    if (generatedCards.length === 0) {
      console.log('[Flashcards] Extracting flashcards directly from slide text & explanations...');
      generatedCards = extractFlashcardsFromSlides(slides);
    }

    console.log(`[Flashcards] Total generatedCards to insert: ${generatedCards.length}`);
    
    // 4. Delete existing flashcards for this lecture to allow regeneration
    try {
      await supabase.from('flashcards').delete().eq('lecture_id', lectureId).eq('user_id', req.user!.id);
    } catch (delErr) {
      await supabaseAdmin.from('flashcards').delete().eq('lecture_id', lectureId).eq('user_id', req.user!.id);
    }

    // 5. Generate embeddings and insert new flashcards into database
    if (generatedCards.length > 0) {
      let embeddings: (number[] | null)[] = [];
      try {
        const textsToEmbed = generatedCards.map(c => `Flashcard: Q: ${c.front} A: ${c.back}`);
        
        const embedReq: AIRequest = {
          task: 'embedding',
          feature: 'flashcard_embedding',
          payload: { texts: textsToEmbed },
          userId: req.user!.id,
          priority: 'medium'
        };
        
        const embedRes = await routeRequest(embedReq);
        const rawResult = embedRes?.result;
        
        if (Array.isArray(rawResult)) {
          if (rawResult.length > 0 && typeof rawResult[0] === 'number') {
            embeddings = [rawResult as number[]];
          } else {
            embeddings = rawResult.map((item: any) => 
              Array.isArray(item) && item.length > 0 && typeof item[0] === 'number' ? (item as number[]) : null
            );
          }
        }
      } catch (embedErr) {
        console.warn('[Flashcards] Embedding generation failed, continuing without embeddings:', embedErr);
      }

      const cardsToInsert = generatedCards.map((c, i) => {
        const emb = embeddings[i];
        const isValidVector = Array.isArray(emb) && emb.length > 0 && typeof emb[0] === 'number';
        return {
          user_id: req.user!.id,
          lecture_id: lectureId,
          front: c.front,
          back: c.back,
          ease_factor: 2.5,
          interval_days: 0,
          repetitions: 0,
          next_review: new Date().toISOString(),
          embedding: isValidVector ? `[${emb.join(',')}]` : null // pgvector format
        };
      });

      const { error: insertError } = await supabase.from('flashcards').insert(cardsToInsert);
      if (insertError) {
        console.warn('[Flashcards] User client insert failed, attempting supabaseAdmin insert:', insertError.message);
        const { error: adminInsertError } = await supabaseAdmin.from('flashcards').insert(cardsToInsert);
        if (adminInsertError) throw adminInsertError;
      }
    }

    res.json({ success: true, count: generatedCards.length, data: generatedCards });
  } catch (err: any) {
    console.error('Flashcard generation error:', err);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const supabase = supabaseAsUser(req.user!.jwt);
    const lectureIdsParam = req.query.lectureIds as string;
    if (!lectureIdsParam) {
      return res.status(400).json({ error: 'lectureIds is required' });
    }
    const lectureIds = lectureIdsParam.split(',');
    
    const { data, error } = await supabase.from('flashcards').select('*').in('lecture_id', lectureIds);
    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

router.post('/review', async (req: Request, res: Response) => {
  const { cardId, rating, currentData } = req.body;
  const userId = req.user!.id;
  const supabase = supabaseAsUser(req.user!.jwt);

  try {
    const nextData = calculateNextReview(currentData, rating as Rating);

    const { error } = await supabase
      .from('flashcards')
      .update({
        ease_factor: nextData.ease_factor,
        interval_days: nextData.interval_days,
        repetitions: nextData.repetitions,
        next_review: nextData.next_review.toISOString(),
        last_rating: rating
      })
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating flashcard:', error);
      return res.status(500).json({ error: 'Failed to update flashcard' });
    }

    res.json({ success: true, nextData: {
      ease_factor: nextData.ease_factor,
      interval_days: nextData.interval_days,
      repetitions: nextData.repetitions,
      next_review: nextData.next_review.toISOString()
    }});
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

export default router;
