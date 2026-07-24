import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { groqChat } from '@/lib/ai/groq';

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { semesterId } = await req.json();
    
    const supabase = await createClient();
    
    // Fetch courses count
    const { count: coursesCount } = await supabase.from('courses').select('id', { count: 'exact' }).eq('user_id', userId!);
    
    // Fetch quiz scores
    const { data: quizzes } = await supabase.from('quiz_attempts').select('score').eq('user_id', userId!).order('score', { ascending: false }).limit(1);
    
    // Fetch profile
    const { data: profile } = await supabase.from('profiles').select('study_streak, total_xp').eq('id', userId!).single();
    
    // Fetch lectures to get names for hardest/best topics based on confidence
    const { data: confidences } = await supabase.from('confidence_ratings').select('rating, slides(lectures(title))').eq('user_id', userId!);
    
    let topTopic = 'Unknown';
    let hardestLecture = 'Unknown';
    
    if (confidences && confidences.length > 0) {
      const best = confidences.reduce((prev, current) => (prev.rating > current.rating) ? prev : current);
      const worst = confidences.reduce((prev, current) => (prev.rating < current.rating) ? prev : current);
      
      const bestLec = (best?.slides as any)?.lectures?.title || (best?.slides as any)?.[0]?.lectures?.title || 'General Studies';
      const worstLec = (worst?.slides as any)?.lectures?.title || (worst?.slides as any)?.[0]?.lectures?.title || 'Complex Topics';
      
      topTopic = Array.isArray(bestLec) ? bestLec[0] : bestLec;
      hardestLecture = Array.isArray(worstLec) ? worstLec[0] : worstLec;
    }

    const realData = {
      courses: coursesCount || 0,
      topTopic,
      hardestLecture,
      bestQuiz: quizzes && quizzes.length > 0 ? quizzes[0].score : 0,
      streak: profile?.study_streak || 0,
      totalHours: Math.round((profile?.total_xp || 0) / 100) // Rough approximation
    };
    
    const prompt = `Write a personal semester review for a university student based on this real data: ${JSON.stringify(realData)}.
Format: Exactly 3 short paragraphs.
Para 1: The journey — what they studied and how the semester unfolded.
Para 2: Their standout achievement and what it shows about them.
Para 3: What to carry into next semester — one specific, actionable focus.
Tone: Warm mentor, highly encouraging, not generic. Reference specific details from the data like the top topic or streak.`;

    const narrative = await groqChat(prompt);
    
    return NextResponse.json({ narrative });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
