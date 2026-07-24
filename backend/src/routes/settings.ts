import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

router.use(authenticateUser);

// GET /api/settings/accessibility
router.get('/accessibility', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      // Create default settings if not exists (should be handled by trigger, but as fallback)
      const { data: newData, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: req.user!.id })
        .select('*')
        .single();
        
      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      return res.json({ settings: newData });
    }

    res.json({ settings: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings/accessibility
router.patch('/accessibility', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // Ensure we don't update user_id
    delete updates.user_id;
    delete updates.created_at;
    
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', req.user!.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ settings: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
