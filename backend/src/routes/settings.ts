import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabaseAsUser } from '../lib/supabase';

const router = Router();

import Groq from 'groq-sdk';

let cachedQuote: { date: string, quote: string, author: string } | null = null;

// Public route: Daily Quote (no auth required)
router.get('/daily-quote', async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  
  if (cachedQuote && cachedQuote.date === today) {
    return res.json({ quote: cachedQuote.quote, author: cachedQuote.author });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
    const result = await groq.chat.completions.create({
      messages: [{ 
        role: 'user', 
        content: `Give me a single motivational quote for university students. 
Format your response exactly as: "Quote text" - Author Name. 
Do not include any other text.` 
      }],
      model: 'llama3-8b-8192'
    });

    const responseText = result.choices[0]?.message?.content?.trim() || '';
    
    // Parse "Quote" - Author format
    const match = responseText.match(/^"?(.*?)"?\s*-\s*(.*)$/);
    
    let quote = "Small, consistent steps build massive momentum.";
    let author = "Unknown";
    
    if (match) {
      quote = match[1];
      author = match[2];
    } else if (responseText) {
      quote = responseText;
      author = "AI";
    }

    cachedQuote = { date: today, quote, author };
    res.json({ quote, author });
  } catch (error) {
    console.error('Error generating daily quote:', error);
    // Fallback if Groq fails
    res.json({ quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" });
  }
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
