import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { groqChat } from '@/lib/ai/groq';

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // 1. Fetch courses count
    const { count: coursesCount } = await supabase
      .from('courses')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    // 2. Fetch quiz scores
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('score, total')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(5);

    // 3. Fetch profile stats
    const { data: profile } = await supabase
      .from('profiles')
      .select('study_streak, total_xp')
      .eq('id', userId)
      .single();

    // 4. Fetch confidence ratings to determine strength areas
    const { data: confidences } = await supabase
      .from('confidence_ratings')
      .select('rating, slides(lectures(title))')
      .eq('user_id', userId);

    let topTopic = 'Core Course Modules';
    let hardestLecture = 'Advanced Concepts';

    if (confidences && confidences.length > 0) {
      const best = confidences.reduce((prev, current) =>
        prev.rating > current.rating ? prev : current
      );
      const worst = confidences.reduce((prev, current) =>
        prev.rating < current.rating ? prev : current
      );

      const bestLec =
        (best?.slides as any)?.lectures?.title ||
        (best?.slides as any)?.[0]?.lectures?.title ||
        'Core Topics';
      const worstLec =
        (worst?.slides as any)?.lectures?.title ||
        (worst?.slides as any)?.[0]?.lectures?.title ||
        'Complex Lectures';

      topTopic = Array.isArray(bestLec) ? bestLec[0] : bestLec;
      hardestLecture = Array.isArray(worstLec) ? worstLec[0] : worstLec;
    }

    const bestQuizScore =
      quizzes && quizzes.length > 0
        ? quizzes[0].total
          ? Math.round((quizzes[0].score / quizzes[0].total) * 100)
          : quizzes[0].score
        : 0;

    const realData = {
      courses: coursesCount || 0,
      topTopic,
      hardestLecture,
      bestQuiz: bestQuizScore,
      streak: profile?.study_streak || 0,
      totalHours: Math.max(1, Math.round((profile?.total_xp || 0) / 100)),
    };

    let narrative: string;
    try {
      const prompt = `Write a personalized, encouraging semester review for a university student based on their empirical study data: ${JSON.stringify(
        realData
      )}.
Format: Exactly 3 concise paragraphs.
Para 1: The journey — what they studied across ${realData.courses} courses.
Para 2: Their key achievement — high score on quizzes (${realData.bestQuiz}%) or streak (${realData.streak} days).
Para 3: Actionable focus going into exams or next semester.
Tone: Academic mentor, grounded and clear, zero AI clichés.`;

      narrative = await groqChat(prompt);
    } catch (_aiErr) {
      narrative = `Over the semester, you engaged with coursework across ${realData.courses} active academic courses, establishing consistent review habits on ${realData.topTopic}.

Your highest quiz performance reached ${realData.bestQuiz}%, demonstrating solid comprehension when concepts are reviewed systematically. With an active streak of ${realData.streak} days, your study rhythm is creating positive academic momentum.

As you head into revisions, prioritize targeted drills on ${realData.hardestLecture} to close knowledge gaps and reinforce long-term active recall.`;
    }

    return NextResponse.json({ narrative, stats: realData });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to generate semester review', details: err.message },
      { status: 500 }
    );
  }
}
