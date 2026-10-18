import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabaseAsUser } from '../lib/supabase';

const router = Router();

import { redis } from '../lib/redis';
import { getCuratedDailyQuote } from '../lib/constants/quotes';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

let memoryCachedQuote: { date: string; quote: string; author: string } | null = null;

// Public route: Daily Quote (no auth required)
router.get('/daily-quote', async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `daily_quote:${today}`;

  // 1. Check in-memory process cache
  if (memoryCachedQuote && memoryCachedQuote.date === today) {
    return res.json({ quote: memoryCachedQuote.quote, author: memoryCachedQuote.author, date: today });
  }

  // 2. Check Redis / NodeCache fallback
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === 'object' && (cached as any).quote) {
        memoryCachedQuote = { date: today, quote: (cached as any).quote, author: (cached as any).author };
        return res.json({ quote: memoryCachedQuote.quote, author: memoryCachedQuote.author, date: today });
      }
    } catch (e) {
      // Redis fallback handles gracefully
    }
  }

  // 3. Fallback quote is deterministic by day-of-year so every day has a different quote
  const defaultQuote = getCuratedDailyQuote(today);
  let quote = defaultQuote.quote;
  let author = defaultQuote.author;

  // 4. Try generating a fresh, unique quote with modern Groq or Gemini
  try {
    if (process.env.GROQ_API_KEY) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [{
          role: 'user',
          content: `Generate a single inspiring, memorable motivational quote specifically for university students studying for exams, mastering difficult skills, or persisting.
Format your response strictly as: "Quote text" - Author Name
Do not include any greeting, explanation, or extra characters.`
        }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 120
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      const match = text.match(/^["“]?(.*?)["”]?\s*[-–—]\s*(.*)$/);
      if (match && match[1].trim().length > 10) {
        quote = match[1].trim();
        author = match[2].trim().replace(/\.$/, '') || 'Unknown';
      }
    } else if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
      const resAI = await model.generateContent(
        'Generate a single inspiring motivational quote for university students. Format strictly as: "Quote text" - Author Name'
      );
      const text = resAI.response.text().trim();
      const match = text.match(/^["“]?(.*?)["”]?\s*[-–—]\s*(.*)$/);
      if (match && match[1].trim().length > 10) {
        quote = match[1].trim();
        author = match[2].trim().replace(/\.$/, '') || 'Unknown';
      }
    }
  } catch (error) {
    console.warn('[Daily Quote] AI quote generation failed, using rotating curated quote for today:', error);
  }

  // 5. Cache for the entire day (24 hours = 86400 seconds)
  memoryCachedQuote = { date: today, quote, author };
  if (redis) {
    try {
      await redis.set(cacheKey, { quote, author }, { ex: 86400 });
    } catch (e) {
      // safe
    }
  }

  return res.json({ quote, author, date: today });
});
router.use(authenticateUser);

// GET /api/settings/accessibility
router.get('/accessibility', async (req: Request, res: Response) => {
  try {
    const supabase = supabaseAsUser(req.user!.jwt);
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }

    if (!data) {
      // Create default settings if not exists (should be handled by trigger, but as fallback)
      const { data: newData, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: req.user!.id })
        .select('*')
        .single();
        
      if (insertError) {
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? insertError.message : undefined });
      }
      return res.json({ settings: newData });
    }

    res.json({ settings: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

// PATCH /api/settings/accessibility
router.patch('/accessibility', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // Ensure we don't update user_id or other protected fields
    delete updates.user_id;
    delete updates.created_at;
    delete updates.id;
    delete updates.updated_at;

    const supabase = supabaseAsUser(req.user!.jwt);
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', req.user!.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }

    res.json({ settings: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

export default router;
