import { Router, Request, Response } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { supabaseAdmin } from '../../lib/supabase';

const router = Router();
router.use(authenticateUser);

router.use(async (req, res, next) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user!.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Admin access required' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    let users: any[] = [];
    const res1 = await supabaseAdmin
      .from('profiles')
      .select('*, institutions:institution_id(id, name, abbreviation), subscriptions(status, plan, current_period_end)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!res1.error && res1.data) {
      users = res1.data;
    } else {
      const res2 = await supabaseAdmin
        .from('profiles')
        .select('*, institutions:institution_id(id, name, abbreviation)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!res2.error && res2.data) {
        users = res2.data;
      } else {
        const res3 = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        users = res3.data || [];
      }
    }
    res.json({ users });
  } catch (err: any) {
    console.error('[AdminUsersList] Error:', err);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

router.get('/:userId/quota', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from('user_quota').select('*').eq('user_id', req.params.userId).single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

export default router;
