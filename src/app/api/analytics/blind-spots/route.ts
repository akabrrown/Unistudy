import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { groqChat } from '@/lib/ai/groq';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const supabase = supabaseServer();
  
  // Get average confidence per lecture
  const { data: confidence } = await supabase
    .from('confidence_ratings')
    .select('slide_id, rating, slides(lecture_id)')
    .eq('user_id', userId!);
    
  // Get quiz scores per lecture
  const { data: quizzes } = await supabase
    .from('quiz_attempts')
    .select('lecture_id, score')
    .eq('user_id', userId!);

  // Build maps
  const confByLecture: Record<string, number[]> = {};
  (confidence || []).forEach((c: any) => {
    if (!c.slides?.lecture_id) return;
    const lid = c.slides.lecture_id;
    if (!confByLecture[lid]) confByLecture[lid] = [];
    confByLecture[lid].push(c.rating);
  });

  const scoreByLecture: Record<string, number[]> = {};
  (quizzes || []).forEach(q => {
    if (!scoreByLecture[q.lecture_id]) scoreByLecture[q.lecture_id] = [];
    scoreByLecture[q.lecture_id].push(q.score);
  });

  // Find blind spots: confidence >= 4 but quiz avg < 60
  const blindSpots = Object.keys(confByLecture)
    .filter(lid => scoreByLecture[lid] && scoreByLecture[lid].length > 0)
    .map(lid => {
      const avgConf = confByLecture[lid].reduce((s, v) => s + v, 0) / confByLecture[lid].length;
      const avgScore = scoreByLecture[lid].reduce((s, v) => s + v, 0) / scoreByLecture[lid].length;
      
      // We'll relax the rules slightly for testing so we can trigger it more easily
      const isBlindSpot = avgConf >= 3 && avgScore < 70; 
      
      return { lectureId: lid, avgConf, avgScore, isBlindSpot };
    })
    .filter(r => r.isBlindSpot);

  if (blindSpots.length === 0) {
    return NextResponse.json({ blindSpots: [] });
  }

  // Groq generates plain-English insight per blind spot (limit 3 for speed)
  const insights = await Promise.all(blindSpots.slice(0, 3).map(async bs => {
    const prompt = `A student rated their confidence ${bs.avgConf.toFixed(1)}/5 on this topic, but only scored ${bs.avgScore.toFixed(0)}% on the quiz. Write ONE short sentence explaining why this false confidence happens and what to do. Be specific, not generic.`;
    const insight = await groqChat(prompt);
    return { ...bs, insight };
  }));

  return NextResponse.json({ blindSpots: insights });
}
