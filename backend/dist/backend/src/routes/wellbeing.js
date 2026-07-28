"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.post('/sessions', async (req, res) => {
    try {
        const { course_id, duration_minutes, status } = req.body;
        // We expect end_time to be now() since this triggers at end of Pomodoro
        const { data, error } = await supabase_1.supabaseAdmin
            .from('study_sessions')
            .insert({
            user_id: req.user.id,
            course_id: course_id || null,
            duration_minutes: duration_minutes || 25,
            status: status || 'completed',
            end_time: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/anxiety', async (req, res) => {
    try {
        const { event_id, feeling, ai_suggestion } = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('anxiety_check_ins')
            .insert({
            user_id: req.user.id,
            event_id,
            feeling,
            ai_suggestion
        })
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/break-rating', async (req, res) => {
    try {
        const { suggestion, rating } = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('study_break_preferences')
            .insert({
            user_id: req.user.id,
            suggestion,
            rating
        })
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/badges', async (req, res) => {
    try {
        // Get last 7 days of sessions
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data, error } = await supabase_1.supabaseAdmin
            .from('study_sessions')
            .select('duration_minutes, status, created_at')
            .eq('user_id', req.user.id)
            .eq('status', 'completed')
            .gte('created_at', sevenDaysAgo.toISOString());
        if (error)
            throw error;
        const totalMinutes = data?.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) || 0;
        const sessionCount = data?.length || 0;
        let badge = 'Just Starting';
        let aiMessage = "Every master was once a beginner. Keep showing up!";
        if (totalMinutes > 600) { // 10 hours
            badge = 'High Effort';
            aiMessage = "Outstanding effort! Your dedication this week is remarkable. Don't forget to rest.";
        }
        else if (sessionCount >= 5) {
            badge = 'Consistent';
            aiMessage = "Consistency is the key to mastery. You're building an amazing habit!";
        }
        else if (totalMinutes > 150) {
            badge = 'Improving';
            aiMessage = "You're steadily building momentum. Keep pushing forward!";
        }
        res.json({ badge, totalMinutes, sessionCount, aiMessage });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
