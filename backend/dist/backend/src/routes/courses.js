"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    if (!token) {
        return res.json([]);
    }
    const supabase = (0, supabase_1.supabaseAsUser)(token);
    const { data, error } = await supabase.from('courses').select('*, lectures(id)').order('created_at', { ascending: false });
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.get('/calendar-events', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', req.user.id)
        .order('date', { ascending: true });
    if (error)
        return res.status(500).json({ error: error.message });
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
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.post('/', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase.from('courses').insert({ ...req.body, user_id: req.user.id }).select('*, lectures(id)').single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.delete('/:id', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
    if (error)
        return res.status(500).json({ error: error.message });
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
        return res.status(500).json({ error: error.message });
    if (!data)
        return res.status(404).json({ error: 'Course not found' });
    res.json(data);
});
router.patch('/:id', auth_1.authenticateUser, async (req, res) => {
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
        .update(req.body)
        .eq('id', req.params.id)
        .select('*, lectures(id)')
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
exports.default = router;
