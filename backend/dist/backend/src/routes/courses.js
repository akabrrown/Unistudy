"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
const CourseInsertSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    course_code: zod_1.z.string().max(50).optional(),
    semester: zod_1.z.number().int().min(1).max(12).optional(),
    year: zod_1.z.number().int().min(2020).max(2100).optional(),
    colour: zod_1.z.string().max(50).optional(),
    programme_id: zod_1.z.string().uuid().optional(),
    archived: zod_1.z.boolean().optional(),
}).strict();
const CourseUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    course_code: zod_1.z.string().max(50).optional(),
    semester: zod_1.z.number().int().min(1).max(12).optional(),
    year: zod_1.z.number().int().min(2020).max(2100).optional(),
    colour: zod_1.z.string().max(50).optional(),
    programme_id: zod_1.z.string().uuid().optional(),
    archived: zod_1.z.boolean().optional(),
}).strict();
router.get('/', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    if (!token) {
        return res.json([]);
    }
    const supabase = (0, supabase_1.supabaseAsUser)(token);
    let { data, error } = await supabase
        .from('courses')
        .select('*, lectures(id, title), past_papers(id, title, year, exam_type, status)')
        .order('created_at', { ascending: false });
    if (error) {
        console.warn('[Courses] Join query failed, falling back to direct select:', error.message);
        const fallback = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });
        if (fallback.error) {
            console.error('[Courses] Direct fetch failed:', fallback.error.message);
            return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? fallback.error.message : undefined });
        }
        data = fallback.data || [];
    }
    if (data) {
        data.forEach((c) => {
            if (Array.isArray(c.lectures)) {
                c.lectures = c.lectures.filter((l) => !l.title?.startsWith('[FAILED'));
            }
            else {
                c.lectures = [];
            }
            if (!Array.isArray(c.past_papers)) {
                c.past_papers = [];
            }
        });
    }
    res.json(data || []);
});
router.get('/calendar-events', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', req.user.id)
        .order('date', { ascending: true });
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json(data);
});
router.post('/calendar-events', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { title, date, time, type } = req.body;
    const { data, error } = await supabase
        .from('calendar_events')
        .insert({
        user_id: req.user.id,
        title,
        date,
        time,
        type
    })
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json(data);
});
router.post('/', auth_1.authenticateUser, async (req, res) => {
    const parsed = CourseInsertSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase.from('courses').insert({ ...parsed.data, user_id: req.user.id }).select('*, lectures(id)').single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json(data);
});
router.delete('/:id', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json({ success: true });
});
router.get('/:id', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('courses')
        .select('*, lectures(id, title, file_url, week, created_at)')
        .eq('id', req.params.id)
        .maybeSingle();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    if (!data)
        return res.status(404).json({ error: 'Course not found' });
    if (Array.isArray(data.lectures)) {
        data.lectures = data.lectures
            .filter((l) => !l.title?.startsWith('[FAILED'))
            .sort((a, b) => {
            const wA = typeof a.week === 'number' && a.week > 0 ? a.week : 9999;
            const wB = typeof b.week === 'number' && b.week > 0 ? b.week : 9999;
            if (wA !== wB)
                return wA - wB;
            return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true });
        });
    }
    res.json(data);
});
router.patch('/:id', auth_1.authenticateUser, async (req, res) => {
    const parsed = CourseUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    // ensure user only updates their own course
    const { data: existing, error: existError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', req.params.id)
        .single();
    if (existError || !existing)
        return res.status(404).json({ error: 'Course not found' });
    const { data, error } = await supabase
        .from('courses')
        .update(parsed.data)
        .eq('id', req.params.id)
        .select('*, lectures(id)')
        .single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json(data);
});
exports.default = router;
