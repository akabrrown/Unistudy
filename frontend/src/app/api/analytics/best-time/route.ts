import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const supabase = await createClient();
  
  const { data } = await supabase
    .from('quiz_attempts')
    .select('score, completed_at')
    .eq('user_id', userId!)
    .not('score', 'is', null);

  if (!data || data.length < 5) {
    // Relaxed from 20 to 5 for development testing
    return NextResponse.json({ insufficient: true, count: data?.length || 0 });
  }

  // Group scores by hour of day
  const byHour: Record<number, number[]> = {};
  data.forEach(a => {
    if (!a.completed_at) return;
    const hour = new Date(a.completed_at).getHours();
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(a.score);
  });

  // Average score per hour
  const hourlyAvg = Object.entries(byHour).map(([hour, scores]) => ({
    hour: parseInt(hour),
    avg: scores.reduce((s, v) => s + v, 0) / scores.length,
    count: scores.length
  })).sort((a, b) => b.avg - a.avg);

  // Top 2 performance windows (relaxed requirement for testing)
  const peakHours = hourlyAvg.filter(h => h.count >= 1).slice(0, 2);

  return NextResponse.json({ hourlyAvg, peakHours, insufficient: false });
}
