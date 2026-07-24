import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabaseAsUser } from '../lib/supabase';

const router = Router();
router.use(authenticateUser);

router.get('/:lectureId', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data, error } = await supabase.from('slide_notes').select('*').eq('lecture_id', req.params.lectureId);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
