"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date().toISOString();
        // Fetch flashcards due for review
        const { data: flashcards, error: flashcardsError } = await supabase_1.supabaseAdmin
            .from('flashcards')
            .select('*')
            .eq('user_id', userId)
            .lte('next_review', now)
            .order('next_review', { ascending: true })
            .limit(25);
        if (flashcardsError)
            throw flashcardsError;
        // Fetch quizzes due for review (assuming a similar mechanism or just a subset of quizzes)
        // For quizzes without spaced repetition, we might just fetch unanswered or recent ones.
        // Let's assume we fetch quizzes related to the user's lectures.
        const { data: quizzes, error: quizzesError } = await supabase_1.supabaseAdmin
            .from('quiz_questions')
            .select('*, courses!inner(user_id)')
            .eq('courses.user_id', userId)
            .limit(25);
        if (quizzesError)
            throw quizzesError;
        // Combine and shuffle or sort
        const combined = [
            ...(flashcards || []).map(f => ({ ...f, type: 'flashcard' })),
            ...(quizzes || []).map(q => ({ ...q, type: 'quiz' }))
        ];
        // Simple shuffle
        const shuffled = combined.sort(() => 0.5 - Math.random());
        res.json({ data: shuffled.slice(0, 25) });
    }
    catch (err) {
        console.error('Error fetching cards:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});
exports.default = router;
