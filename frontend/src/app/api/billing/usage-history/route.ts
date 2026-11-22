import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const limit = Math.min(500, Math.max(5, Number(searchParams.get('limit') || 100)));
  const featureFilter = searchParams.get('feature');
  const poolFilter = searchParams.get('pool_type');

  try {
    let query = supabase
      .from('ai_request_log')
      .select('id, feature, provider, pool_type, requests_cost, user_plan, called_at')
      .eq('user_id', userId);

    if (featureFilter && featureFilter !== 'all') {
      query = query.eq('feature', featureFilter);
    }
    if (poolFilter && poolFilter !== 'all') {
      query = query.eq('pool_type', poolFilter);
    }

    const { data: logs, error: logError } = await query
      .order('called_at', { ascending: false })
      .limit(limit);

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    let totalPoints = 0;
    let todayPoints = 0;
    const featureBreakdown: Record<string, { count: number; points: number; credits: number }> = {};

    const items = (logs || []).map((l: any) => {
      const costPts = Number(l.requests_cost || 0);
      totalPoints += costPts;

      const calledAtDate = new Date(l.called_at);
      if (calledAtDate >= startOfToday) {
        todayPoints += costPts;
      }

      const feat = l.feature || 'other';
      if (!featureBreakdown[feat]) {
        featureBreakdown[feat] = { count: 0, points: 0, credits: 0 };
      }
      featureBreakdown[feat].count += 1;
      featureBreakdown[feat].points += costPts;
      featureBreakdown[feat].credits = Number((featureBreakdown[feat].points / 100).toFixed(2));

      return {
        id: l.id,
        feature: l.feature,
        provider: l.provider,
        pool_type: l.pool_type,
        cost_points: costPts,
        cost_credits: Number((costPts / 100).toFixed(2)),
        called_at: l.called_at,
      };
    });

    return NextResponse.json(
      {
        items,
        summary: {
          total_points_used: totalPoints,
          total_credits_used: Number((totalPoints / 100).toFixed(2)),
          today_points_used: todayPoints,
          today_credits_used: Number((todayPoints / 100).toFixed(2)),
          total_count: items.length,
          feature_breakdown: featureBreakdown,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
