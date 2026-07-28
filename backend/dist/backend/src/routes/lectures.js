"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.get('/detail/:lectureId', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('lectures')
        .select('id, title, week, processing, slide_count, courses(course_code, title)')
        .eq('id', req.params.lectureId)
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.get('/:courseId', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase.from('lectures').select('*').eq('course_id', req.params.courseId).order('week', { ascending: true });
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.post('/', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase.from('lectures').insert(req.body).select().single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.get('/:lectureId/slides', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('slides')
        .select('*')
        .eq('lecture_id', req.params.lectureId)
        .order('slide_number', { ascending: true });
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.get('/:slideId/notes', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('slide_notes')
        .select('content')
        .eq('slide_id', req.params.slideId)
        .eq('user_id', req.user.id)
        .single();
    // Ignore single() not found error
    if (error && error.code !== 'PGRST116')
        return res.status(500).json({ error: error.message });
    res.json(data || { content: '' });
});
router.patch('/:id', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('lectures')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.post('/:slideId/notes', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { content } = req.body;
    const { error } = await supabase
        .from('slide_notes')
        .upsert({
        user_id: req.user.id,
        slide_id: req.params.slideId,
        content
    }, { onConflict: 'user_id, slide_id' });
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ success: true });
});
router.post('/bulk-delete', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { lectureIds } = req.body;
    if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
        return res.status(400).json({ error: 'lectureIds must be a non-empty array' });
    }
    const { error } = await supabase.from('lectures').delete().in('id', lectureIds);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ success: true });
});
router.delete('/:id', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { error } = await supabase.from('lectures').delete().eq('id', req.params.id);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ success: true });
});
exports.default = router;
