import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('quiz_attempts')
    .select('score, total, completed_at')
    .eq('user_id', userId)
    .not('score', 'is', null);

  if (!data || data.length < 2) {
    return NextResponse.json({
      insufficient: true,
      count: data?.length || 0,
      required: 2,
      peakHours: [],
    });
  }

  // Group scores by hour of day (0-23)
  const byHour: Record<number, number[]> = {};
  data.forEach((a: any) => {
    if (!a.completed_at) return;
    const hour = new Date(a.completed_at).getHours();
    if (!byHour[hour]) byHour[hour] = [];
    const percentage = a.total && a.total > 0 ? (a.score / a.total) * 100 : a.score;
    byHour[hour].push(percentage);
  });

  // Calculate average score per hour
  const hourlyAvg = Object.entries(byHour)
    .map(([hourStr, scores]) => {
      const hour = parseInt(hourStr);
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      const hour12 = hour % 12 || 12;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = `${hour12}:00 ${ampm}`;

      return {
        hour,
        formattedHour,
        avg,
        count: scores.length,
      };
    })
    .sort((a, b) => b.avg - a.avg || b.count - a.count);

  const peakHours = hourlyAvg.slice(0, 2);

  return NextResponse.json({
    hourlyAvg,
    peakHours,
    insufficient: false,
    totalAttempts: data.length,
  });
}
