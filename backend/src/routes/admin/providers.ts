import { Router, Request, Response } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { getAllProviderStatuses } from '../../lib/ai/balance';
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
    const statuses = await getAllProviderStatuses();
    res.json(statuses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:provider', async (req: Request, res: Response) => {
  const { provider } = req.params;
  const updates = req.body;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_ai_balance')
      .update(updates)
      .eq('provider', provider)
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
