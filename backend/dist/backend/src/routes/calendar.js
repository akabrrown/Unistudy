"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const EventInsertSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: zod_1.z.enum(['exam', 'assignment', 'session']),
    time: zod_1.z.string().max(20).optional(),
});
const EventUpdateSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(100).optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    type: zod_1.z.enum(['exam', 'assignment', 'session']).optional(),
    time: zod_1.z.string().max(20).optional(),
});
// GET /api/calendar or /api/calendar/events
async function handleGetEvents(req, res) {
    try {
        const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
        const typeFilter = req.query.type;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        let query = supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', req.user.id)
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
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
router.get('/', handleGetEvents);
router.get('/events', handleGetEvents);
// POST /api/calendar
router.post('/', async (req, res) => {
    try {
        const parsed = EventInsertSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
        }
        const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
            user_id: req.user.id,
            ...parsed.data,
        })
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.status(201).json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// PUT /api/calendar
router.put('/', async (req, res) => {
    try {
        const parsed = EventUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
        }
        const { id, ...updates } = parsed.data;
        const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
        const { data, error } = await supabase
            .from('calendar_events')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// DELETE /api/calendar
router.delete('/', async (req, res) => {
    try {
        const id = (req.query.id || req.body?.id);
        if (!id) {
            return res.status(400).json({ error: 'Missing event ID' });
        }
        const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: 'Event deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
exports.default = router;
