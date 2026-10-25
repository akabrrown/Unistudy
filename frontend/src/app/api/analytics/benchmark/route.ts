import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const courseId = url.searchParams.get('courseId');

  if (!courseId) {
    return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Try RPC first
  try {
    const { data, error: rpcError } = await supabase.rpc('get_benchmark', {
      p_user_id: userId,
      p_course_id: courseId,
    });

    if (!rpcError && data) {
      return NextResponse.json({ benchmarks: data });
    }
  } catch (_e) {
    // Proceed to fallback
  }

  // 2. Direct database query fallback
  try {
    const { data: lectures } = await supabase
      .from('lectures')
      .select('id, title')
      .eq('course_id', courseId);

    if (!lectures || lectures.length === 0) {
      return NextResponse.json({ benchmarks: [] });
    }

    const lectureIds = lectures.map((l) => l.id);
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('lecture_id, user_id, score, total')
      .in('lecture_id', lectureIds);

    const benchmarks = lectures.map((lec) => {
      const lecAttempts = (attempts || []).filter((a) => a.lecture_id === lec.id);
      const studentAttempts = lecAttempts.filter((a) => a.user_id === userId);

      const toPercent = (a: any) =>
        a.total && a.total > 0 ? (a.score / a.total) * 100 : a.score;

      const studentAvg =
        studentAttempts.length > 0
          ? studentAttempts.reduce((s, a) => s + toPercent(a), 0) / studentAttempts.length
          : null;

      const courseAvg =
        lecAttempts.length > 0
          ? lecAttempts.reduce((s, a) => s + toPercent(a), 0) / lecAttempts.length
          : studentAvg;

      return {
        lecture_title: lec.title,
        student_avg: studentAvg !== null ? Math.round(studentAvg) : null,
        course_avg: courseAvg !== null ? Math.round(courseAvg) : null,
        percentile: studentAvg !== null && courseAvg !== null
          ? Math.min(100, Math.max(10, Math.round((studentAvg / (courseAvg || 1)) * 50)))
          : null,
      };
    });

    return NextResponse.json({ benchmarks });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch benchmarks', details: err.message },
      { status: 500 }
    );
  }
}
