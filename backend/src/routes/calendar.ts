import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { supabaseAsUser } from '../lib/supabase';

const router = Router();
router.use(authenticateUser);

const EventInsertSchema = z.object({
  title: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['exam', 'assignment', 'session']),
  time: z.string().max(20).optional(),
});

const EventUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['exam', 'assignment', 'session']).optional(),
  time: z.string().max(20).optional(),
});

// GET /api/calendar or /api/calendar/events
async function handleGetEvents(req: Request, res: Response) {
  try {
    const supabase = supabaseAsUser(req.user!.jwt);
    const typeFilter = req.query.type as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('date', { ascending: true });

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }
    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    // Return array directly (and include events property for flexibility)
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

router.get('/', handleGetEvents);
router.get('/events', handleGetEvents);

// POST /api/calendar
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = EventInsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }

    const supabase = supabaseAsUser(req.user!.jwt);
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: req.user!.id,
        ...parsed.data,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/calendar
router.put('/', async (req: Request, res: Response) => {
  try {
    const parsed = EventUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }

    const { id, ...updates } = parsed.data;
    const supabase = supabaseAsUser(req.user!.jwt);

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/calendar
router.delete('/', async (req: Request, res: Response) => {
  try {
    const id = (req.query.id || req.body?.id) as string;
    if (!id) {
      return res.status(400).json({ error: 'Missing event ID' });
    }

    const supabase = supabaseAsUser(req.user!.jwt);
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user!.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;

