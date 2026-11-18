import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabaseAsUser, supabaseAdmin } from '../lib/supabase';

const router = Router();

import { getCuratedDailyQuote } from '../lib/constants/quotes';

let memoryCachedQuote: { date: string; quote: string; author: string } | null = null;

// Public route: Daily Quote (no auth required, zero LLM/Redis work)
router.get('/daily-quote', (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  if (!memoryCachedQuote || memoryCachedQuote.date !== today) {
    const curated = getCuratedDailyQuote(today);
    memoryCachedQuote = { date: today, quote: curated.quote, author: curated.author };
  }

  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
  return res.json({ quote: memoryCachedQuote.quote, author: memoryCachedQuote.author, date: today });
});

const defaultSettings = {
  theme: 'light',
  font_family: 'inter',
  text_size: 'normal',
  line_spacing: 'normal',
  color_blind_mode: null,
  high_contrast: false,
  ai_tutor_name: 'Uni',
  ai_personality: 'neutral',
  ai_reading_level: 'intermediate',
  ai_tone: 'academic',
  learning_style: null,
  language: 'en',
  region: 'north-america',
  low_bandwidth: false,
  simplified_mode: false,
};

// GET /api/settings/accessibility - Graceful for both authenticated users and public visitors
router.get('/accessibility', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.json({ settings: defaultSettings });
    }

    const token = authHeader.split(' ')[1];
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.json({ settings: defaultSettings });
    }

    const userId = authData.user.id;
    const supabase = supabaseAsUser(token);
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching settings, returning defaults:', error);
      return res.json({ settings: defaultSettings });
    }

    if (!data) {
      // Create default settings if not exists
      const { data: newData, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: userId })
        .select('*')
        .single();
        
      if (insertError) {
        return res.json({ settings: defaultSettings });
      }
      return res.json({ settings: newData });
    }

    res.json({ settings: data });
  } catch (err: any) {
    res.json({ settings: defaultSettings });
  }
});

router.use(authenticateUser);

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
