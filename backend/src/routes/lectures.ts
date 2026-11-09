import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { supabaseAsUser } from '../lib/supabase';
import { env } from '../config/env';

const router = Router();
router.use(authenticateUser);

const LectureInsertSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  course_id: z.string().uuid(),
  week: z.number().int().min(1).max(30).optional(),
  file_url: z.string().url().optional(),
});

const LectureUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  week: z.number().int().min(1).max(30).optional(),
  file_url: z.string().url().optional(),
  processing: z.boolean().optional(),
}).strict();

router.get('/detail/:lectureId', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data, error } = await supabase
    .from('lectures')
    .select('id, course_id, title, week, processing, slide_count, courses(course_code, title)')
    .eq('id', req.params.lectureId)
    .single();
  
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  if (data && data.title?.startsWith('[FAILED')) {
    return res.status(404).json({ error: 'Lecture not found' });
  }
  res.json(data);
});

router.get('/:courseId', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data, error } = await supabase.from('lectures').select('*').eq('course_id', req.params.courseId).order('week', { ascending: true });
  
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  const filtered = Array.isArray(data) ? data.filter((l: any) => !l.title?.startsWith('[FAILED')) : [];
  res.json(filtered);
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = LectureInsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
  }
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data, error } = await supabase.from('lectures').insert(parsed.data).select().single();
  
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  res.json(data);
});

router.get('/:lectureId/slides', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data, error } = await supabase
    .from('slides')
    .select('*')
    .eq('lecture_id', req.params.lectureId)
    .order('slide_number', { ascending: true });
  
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  res.json(data);
});

router.get('/:slideId/notes', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data, error } = await supabase
    .from('slide_notes')
    .select('content')
    .eq('slide_id', req.params.slideId)
    .eq('user_id', req.user!.id)
    .single();
  
  // Ignore single() not found error
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  res.json(data || { content: '' });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = LectureUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
  }
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data, error } = await supabase
    .from('lectures')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  res.json(data);
});

router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const lectureId = req.params.id;
    const userId = req.user!.id;
    let fileUrl = req.body?.file_url;

    // If file_url was not supplied in body, look it up from the lecture record
    if (!fileUrl) {
      const supabase = supabaseAsUser(req.user!.jwt);
      const { data: lec } = await supabase.from('lectures').select('file_url').eq('id', lectureId).single();
      fileUrl = lec?.file_url;
    }

    if (!fileUrl) {
      return res.status(400).json({ error: 'Lecture has no associated file_url to convert.' });
    }

    const converterBase = (env.CONVERTER_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
    const secret = (env.CONVERTER_SECRET || 'zT9xK2mP7vL4wQ8rN5bH1jC6dF3gY0').trim();

    const formData = new FormData();
    formData.append('lecture_id', String(lectureId));
    formData.append('user_id', String(userId));
    formData.append('file_url', String(fileUrl));

    const convertRes = await fetch(`${converterBase}/convert`, {
      method: 'POST',
      headers: {
        'X-Converter-Secret': secret,
      },
      body: formData,
    });

    if (!convertRes.ok) {
      const errText = await convertRes.text().catch(() => '');
      return res.status(convertRes.status).json({
        error: errText || `Converter returned HTTP ${convertRes.status}`
      });
    }

    const data = await convertRes.json();
    res.json(data);
  } catch (error: any) {
    console.error('Lecture conversion dispatch error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch conversion' });
  }
});

router.post('/:slideId/notes', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { content } = req.body;
  const { error } = await supabase
    .from('slide_notes')
    .upsert({ 
      user_id: req.user!.id, 
      slide_id: req.params.slideId, 
      content 
    }, { onConflict: 'user_id, slide_id' });
  
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  res.json({ success: true });
});

router.post('/bulk-delete', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { lectureIds } = req.body;
  if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
    return res.status(400).json({ error: 'lectureIds must be a non-empty array' });
  }
  
  const { error } = await supabase.from('lectures').delete().in('id', lectureIds);
  
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  res.json({ success: true });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const supabase = supabaseAsUser(req.user!.jwt);
  const { error } = await supabase.from('lectures').delete().eq('id', req.params.id);
  
  if (error) return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  res.json({ success: true });
});

export default router;
