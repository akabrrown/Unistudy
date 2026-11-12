import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { withAIQuota } from '../middleware/quotaGuard';
import { routeRequest, AIRequest } from '../lib/ai/router';
import { consumeUserQuota } from '../lib/ai/quota';
import { supabaseAdmin, supabaseAsUser } from '../lib/supabase';
import { calculateNextReview, Rating } from '../lib/utils/sm2';
import {
  extractFlashcardsFromSlides,
  parseFlashcardsJson,
} from '../../../shared/lib/flashcardExtractor';

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
        payload: { prompt: combinedText, slides },
        userId: req.user!.id,
        priority: 'medium',
        identifiers: [lectureId] // Cache per lecture
      };

      const response = await routeRequest(aiReq);

      console.log(`[Flashcards] Provider: ${response.provider}, responseMs: ${response.responseMs}ms`)
      
      consumeUserQuota(aiReq.userId, aiReq.feature, req.body?.model_tier || req.headers?.['x-model-tier'] || 'default').catch(console.error);
      
      // Parse result robustly using shared parser
      generatedCards = parseFlashcardsJson(response.result);
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
    const { error: delError } = await supabase.from('flashcards').delete().eq('lecture_id', lectureId).eq('user_id', req.user!.id);
    if (delError) {
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
    const lectureIdsParam = req.query.lectureIds as string | undefined;
    const dueOnly = req.query.due === 'true';

    const buildQuery = (client: typeof supabase) => {
      let query = client
        .from('flashcards')
        .select('*')
        .eq('user_id', req.user!.id);

      if (lectureIdsParam) {
        const lectureIds = lectureIdsParam.split(',').filter(Boolean);
        if (lectureIds.length > 0) {
          query = query.in('lecture_id', lectureIds);
        }
      }
      if (dueOnly) {
        query = query.lte('next_review', new Date(Date.now() + 60000).toISOString());
      }
      return query;
    };

    const { data, error } = await buildQuery(supabase);
    if (!error && Array.isArray(data) && data.length > 0) {
      return res.json({ data });
    }

    // Fallback to admin client scoped strictly to authenticated req.user.id if RLS blocks user SELECT
    const { data: adminData, error: adminErr } = await buildQuery(supabaseAdmin);
    if (adminErr) throw adminErr;
    res.json({ data: adminData || [] });
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
    const updatePayload = {
      ease_factor: nextData.ease_factor,
      interval_days: nextData.interval_days,
      repetitions: nextData.repetitions,
      next_review: nextData.next_review.toISOString(),
      last_rating: rating
    };

    const { data: updatedRows, error } = await supabase
      .from('flashcards')
      .update(updatePayload)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select('id');

    if (error || !updatedRows || updatedRows.length === 0) {
      const { error: adminUpdateErr } = await supabaseAdmin
        .from('flashcards')
        .update(updatePayload)
        .eq('id', cardId)
        .eq('user_id', userId);

      if (adminUpdateErr) {
        console.error('Error updating flashcard:', adminUpdateErr);
        return res.status(500).json({ error: 'Failed to update flashcard' });
      }
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
