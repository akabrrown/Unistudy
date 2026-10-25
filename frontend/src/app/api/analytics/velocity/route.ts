import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // 1. Try Supabase RPC first if configured
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_mastery_velocity', {
      p_user_id: userId,
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const avgVelocity =
        rpcData.reduce((s: number, d: any) => s + (d.days_to_master || 1), 0) / rpcData.length;
      const baselineSet = rpcData.slice(0, 5);
      const baseline =
        baselineSet.reduce((s: number, d: any) => s + (d.days_to_master || 1), 0) /
        Math.max(1, baselineSet.length);

      const trend =
        avgVelocity <= baseline * 0.9
          ? 'Accelerating'
          : avgVelocity <= baseline * 1.15
          ? 'On Track'
          : 'Slowing';

      return NextResponse.json({
        avgVelocity: avgVelocity.toFixed(1),
        baseline: baseline.toFixed(1),
        trend,
        masteredCount: rpcData.length,
        data: rpcData,
      });
    }
  } catch (_e) {
    // Fall back to robust direct query
  }

  // 2. Direct database calculation from quiz_attempts
  try {
    const { data: quizzes, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('lecture_id, score, total, completed_at, lectures(title)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true });

    if (quizError || !quizzes || quizzes.length === 0) {
      return NextResponse.json({
        avgVelocity: null,
        baseline: '3.5',
        trend: 'New Student',
        masteredCount: 0,
        quizzesTaken: 0,
        data: [],
      });
    }

    // Group attempts by lecture
    const lectureMap: Record<
      string,
      { title: string; firstDate: Date; masteredDate: Date | null }
    > = {};

    quizzes.forEach((q: any) => {
      const lid = q.lecture_id;
      if (!lid) return;
      const date = new Date(q.completed_at || Date.now());
      const title = q.lectures?.title || 'Lecture Module';
      const percentage = (q.score / (q.total || 100)) * 100;
      const isMastered = q.score >= 75 || percentage >= 75;

      if (!lectureMap[lid]) {
        lectureMap[lid] = {
          title,
          firstDate: date,
          masteredDate: isMastered ? date : null,
        };
      } else if (isMastered && !lectureMap[lid].masteredDate) {
        lectureMap[lid].masteredDate = date;
      }
    });

    const masteredLectures = Object.values(lectureMap).filter((l) => l.masteredDate !== null);

    if (masteredLectures.length === 0) {
      return NextResponse.json({
        avgVelocity: null,
        baseline: '3.5',
        trend: 'In Progress',
        masteredCount: 0,
        quizzesTaken: quizzes.length,
        data: [],
      });
    }

    const calculatedDays = masteredLectures.map((l) => {
      const diffMs = l.masteredDate!.getTime() - l.firstDate.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return {
        lecture_title: l.title,
        days_to_master: diffDays,
      };
    });

    const avg =
      calculatedDays.reduce((acc, curr) => acc + curr.days_to_master, 0) / calculatedDays.length;
    const baseline = 3.5;
    const trend =
      avg <= baseline * 0.9 ? 'Accelerating' : avg <= baseline * 1.15 ? 'On Track' : 'Slowing';

    return NextResponse.json({
      avgVelocity: avg.toFixed(1),
      baseline: baseline.toFixed(1),
      trend,
      masteredCount: masteredLectures.length,
      quizzesTaken: quizzes.length,
      data: calculatedDays,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to calculate velocity', details: err.message },
      { status: 500 }
    );
  }
}
