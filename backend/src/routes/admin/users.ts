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
    const { data, error } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ users: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId/quota', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from('user_quota').select('*').eq('user_id', req.params.userId).single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
