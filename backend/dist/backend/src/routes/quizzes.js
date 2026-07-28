"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const quotaGuard_1 = require("../middleware/quotaGuard");
const router_1 = require("../lib/ai/router");
const quota_1 = require("../lib/ai/quota");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
// Generate quiz using AI
router.post('/generate', (0, quotaGuard_1.withAIQuota)('quiz_generation'), async (req, res) => {
    const { lectureId, imageBase64Array, questionCount, difficulty } = req.body;
    const aiReq = {
        task: 'batch_text',
        feature: 'quiz_generation',
        payload: { imageBase64Array, questionCount, difficulty },
        userId: req.user.id,
        priority: 'high',
        identifiers: [lectureId, String(questionCount), difficulty]
    };
    try {
        const response = await (0, router_1.routeRequest)(aiReq);
        (0, quota_1.consumeUserQuota)(aiReq.userId, aiReq.feature).catch(console.error);
        let questionsData = response.result;
        if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData) && Array.isArray(questionsData.questions)) {
            questionsData = questionsData.questions;
        }
        else if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData) && Array.isArray(questionsData.quiz)) {
            questionsData = questionsData.quiz;
        }
        if (Array.isArray(questionsData)) {
            const toInsert = questionsData.map((q) => ({
                lecture_id: lectureId,
                question: q.question,
                options: q.options || [],
                correct_option: q.correct_option || '',
                explanation: q.explanation || '',
                difficulty: difficulty === 'hard' ? 5 : difficulty === 'medium' ? 3 : 1,
                type: q.type || 'mcq'
            }));
            const { error: insertErr } = await supabase_1.supabaseAdmin.from('quiz_questions').insert(toInsert);
            if (insertErr) {
                console.error('Failed to insert quiz questions:', insertErr);
                if (insertErr.code === '23503') {
                    return res.status(400).json({ error: 'Cannot generate a quiz for a placeholder lecture. Please upload slides first.' });
                }
                return res.status(500).json({ error: 'Failed to save generated quiz questions to the database.' });
            }
        }
        res.json(questionsData);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/', async (req, res) => {
    try {
        const lectureIdsParam = req.query.lectureIds;
        if (!lectureIdsParam) {
            return res.status(400).json({ error: 'lectureIds is required' });
        }
        const lectureIds = lectureIdsParam.split(',');
        const { data, error } = await supabase_1.supabaseAdmin.from('quiz_questions').select('*').in('lecture_id', lectureIds);
        if (error)
            throw error;
        res.json({ data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/attempt', async (req, res) => {
    const { lectureId, score, total, timeTaken } = req.body;
    const userId = req.user.id;
    try {
        const { error: insertError } = await supabase_1.supabaseAdmin.from('quiz_attempts').insert({
            user_id: userId,
            lecture_id: lectureId,
            score,
            total,
            time_taken: timeTaken
        });
        if (insertError) {
            console.error('Failed to insert quiz attempt:', insertError);
            return res.status(500).json({ error: 'Failed to record attempt.' });
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
