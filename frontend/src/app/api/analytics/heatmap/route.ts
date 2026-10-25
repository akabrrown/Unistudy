import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const supabase = await createClient();

  const byDate: Record<string, number> = {};

  const recordScore = (isoDateStr?: string | null, points: number = 10) => {
    if (!isoDateStr) return;
    try {
      const dateKey = new Date(isoDateStr).toISOString().split('T')[0];
      if (dateKey) {
        byDate[dateKey] = (byDate[dateKey] || 0) + points;
      }
    } catch (_err) {
      // Ignore malformed timestamp
    }
  };

  try {
    // 1. Fetch study sessions
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('created_at, start_time, duration_minutes')
      .eq('user_id', userId)
      .gte('created_at', startOfYear);

    (sessions || []).forEach((s: any) => {
      const timestamp = s.created_at || s.start_time;
      const duration = s.duration_minutes || 25;
      recordScore(timestamp, Math.max(15, Math.floor(duration)));
    });
  } catch (_e) {
    // Graceful fallback
  }

  try {
    // 2. Fetch quiz attempts
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('completed_at, score')
      .eq('user_id', userId)
      .gte('completed_at', startOfYear);

    (quizzes || []).forEach((q: any) => {
      recordScore(q.completed_at, 25);
    });
  } catch (_e) {
    // Graceful fallback
  }

  try {
    // 3. Fetch confidence ratings / slide interactions
    const { data: ratings } = await supabase
      .from('confidence_ratings')
      .select('rated_at')
      .eq('user_id', userId)
      .gte('rated_at', startOfYear);

    (ratings || []).forEach((r: any) => {
      recordScore(r.rated_at, 5);
    });
  } catch (_e) {
    // Graceful fallback
  }

  return NextResponse.json(byDate);
}
