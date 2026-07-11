import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const supabase = supabaseServer();
  
  // Get all lectures with first-view date and first 80%+ quiz date
  const { data, error: rpcError } = await supabase.rpc('get_mastery_velocity', {
    p_user_id: userId
  });
  
  if (rpcError || !data || data.length === 0) {
    return NextResponse.json({ avgVelocity: 0, baseline: 0, trend: 'N/A', data: [] });
  }

  // data: [{ lecture_title, first_viewed, first_mastered, days_to_master }]
  const avgVelocity = data.reduce((s: number, d: any) => s + (d.days_to_master || 0), 0) / data.length;
  
  // Baseline = first 10 items average (or fewer if not enough data)
  const baselineSet = data.slice(0, 10);
  const baseline = baselineSet.reduce((s: number, d: any) => s + (d.days_to_master || 0), 0) / Math.max(1, baselineSet.length);
  
  const trend = avgVelocity < baseline * 0.9 ? 'Accelerating'
    : avgVelocity < baseline * 1.1 ? 'On Track'
    : 'Slowing';
    
  return NextResponse.json({ avgVelocity: avgVelocity.toFixed(1), baseline: baseline.toFixed(1), trend, data });
}
