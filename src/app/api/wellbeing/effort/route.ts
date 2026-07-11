import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { startOfWeek, formatISO } from 'date-fns';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  
  const supabase = supabaseServer();
  const weekStart = formatISO(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [sessions, quizzes, flashcards, papers] = await Promise.all([
    supabase.from('study_sessions').select('duration').eq('user_id', userId!).gte('started_at', weekStart),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId!).gte('completed_at', weekStart),
    supabase.from('flashcards').select('repetitions').eq('user_id', userId!).gt('repetitions', 0),
    supabase.from('past_paper_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId!).gte('started_at', weekStart),
  ]);
  
  const studyHours = (sessions.data || []).reduce((s, r) => s + (r.duration || 0), 0) / 3600;
  
  const effortScore = Math.min(100, 
    (studyHours * 10) + 
    ((quizzes.count || 0) * 5) + 
    ((flashcards.data || []).length * 2) + 
    ((papers.count || 0) * 20)
  );
  
  const badge = 
    effortScore >= 80 ? 'High Effort' :
    effortScore >= 50 ? 'Consistent' :
    effortScore >= 25 ? 'Improving' : 'Just Starting';
    
  return NextResponse.json({ 
    effortScore: Math.round(effortScore), 
    badge, 
    studyHours: parseFloat(studyHours.toFixed(1)) 
  });
}
