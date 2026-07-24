import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const supabase = await createClient();
  const { data } = await supabase
    .from('study_sessions')
    .select('session_date, slides_viewed, duration')
    .eq('user_id', userId!)
    .gte('session_date', startOfYear)
    .order('session_date', { ascending: true });

  // Aggregate by date
  const byDate: Record<string, number> = (data || []).reduce((acc: any, s: any) => {
    const key = s.session_date;
    if (!acc[key]) acc[key] = 0;
    
    // Calculate daily score
    const slidesViewed = s.slides_viewed || 0;
    const durationMins = Math.floor((s.duration || 0) / 60);
    
    // arbitrary scoring matching the plan
    const score = (slidesViewed * 2) + Math.floor(durationMins / 5);
    
    acc[key] += score;
    return acc;
  }, {});

  return NextResponse.json(byDate);
}
