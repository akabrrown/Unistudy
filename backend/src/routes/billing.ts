import { Router, Request, Response } from 'express';
import { authenticateUser as requireAuth } from '../middleware/auth';
import { supabaseAsUser } from '../lib/supabase';

const router = Router();

router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const supabase = supabaseAsUser(token);
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_end, cancel_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ 
      subscription: subscription || {
        plan_id: 'free',
        status: 'active',
        current_period_end: null
      }
    });
  } catch (error: any) {
    console.error('Get Subscription Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
