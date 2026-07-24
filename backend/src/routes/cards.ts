import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
router.use(authenticateUser);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date().toISOString();

    // Fetch flashcards due for review
    const { data: flashcards, error: flashcardsError } = await supabaseAdmin
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review', now)
      .order('next_review', { ascending: true })
      .limit(25);

    if (flashcardsError) throw flashcardsError;

    // Fetch quizzes due for review (assuming a similar mechanism or just a subset of quizzes)
    // For quizzes without spaced repetition, we might just fetch unanswered or recent ones.
    // Let's assume we fetch quizzes related to the user's lectures.
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('quiz_questions')
      .select('*, courses!inner(user_id)')
      .eq('courses.user_id', userId)
      .limit(25);

    if (quizzesError) throw quizzesError;

    // Combine and shuffle or sort
    const combined = [
      ...(flashcards || []).map(f => ({ ...f, type: 'flashcard' })),
      ...(quizzes || []).map(q => ({ ...q, type: 'quiz' }))
    ];

    // Simple shuffle
    const shuffled = combined.sort(() => 0.5 - Math.random());

    res.json({ data: shuffled.slice(0, 25) });
  } catch (err: any) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default router;
