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
    const { lectureId, questionCount = 5, difficulty = 'medium' } = req.body;
    if (!lectureId) {
        return res.status(400).json({ error: 'lectureId is required' });
    }
    // Fetch slides from DB for the given lecture — use raw_text for text-based generation
    const { data: slides, error: slidesErr } = await supabase_1.supabaseAdmin
        .from('slides')
        .select('slide_number, raw_text, image_url')
        .eq('lecture_id', lectureId)
        .order('slide_number');
    if (slidesErr) {
        console.error('Failed to fetch slides for quiz generation:', slidesErr);
        return res.status(500).json({ error: 'Failed to retrieve lecture slides.' });
    }
    if (!slides || slides.length === 0) {
        return res.status(400).json({ error: 'No slides found for this lecture. Please upload slides first.' });
    }
    // Build text content from slides for the AI prompt
    const slideTexts = slides
        .filter((s) => s.raw_text && s.raw_text.trim().length > 0)
        .map((s) => `[Slide ${s.slide_number}]\n${s.raw_text.trim()}`);
    if (slideTexts.length === 0) {
        return res.status(400).json({ error: 'Slides have no text content. Cannot generate quiz without readable slide text.' });
    }
    const slidesPrompt = slideTexts.join('\n\n');
    const aiReq = {
        task: 'batch_text',
        feature: 'quiz_generation',
        payload: { prompt: slidesPrompt, questionCount, difficulty },
        userId: req.user.id,
        priority: 'high',
        identifiers: [lectureId, String(questionCount), difficulty]
    };
    try {
        const response = await (0, router_1.routeRequest)(aiReq);
        (0, quota_1.consumeUserQuota)(aiReq.userId, aiReq.feature, req.body?.model_tier || req.headers?.['x-model-tier'] || 'default').catch(console.error);
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
            const { error: insertErr } = await (0, supabase_1.supabaseAsUser)(req.user.jwt).from('quiz_questions').insert(toInsert);
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
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
router.get('/', async (req, res) => {
    try {
        const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
        const lectureIdsParam = req.query.lectureIds;
        if (!lectureIdsParam) {
            return res.status(400).json({ error: 'lectureIds is required' });
        }
        const lectureIds = lectureIdsParam.split(',');
        const { data, error } = await supabase.from('quiz_questions').select('*').in('lecture_id', lectureIds);
        if (error)
            throw error;
        res.json({ data });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
router.post('/attempt', async (req, res) => {
    const { lectureId, score, total, timeTaken } = req.body;
    const userId = req.user.id;
    try {
        const { error: insertError } = await (0, supabase_1.supabaseAsUser)(req.user.jwt).from('quiz_attempts').insert({
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
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
exports.default = router;
