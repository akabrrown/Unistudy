
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
  const limit = Math.min(100, Math.max(5, Number(searchParams.get('limit') || 25)));

  try {
    const { data: logs, error: logError } = await supabase
      .from('ai_request_log')
      .select('id, feature, provider, pool_type, requests_cost, user_plan, called_at')
      .eq('user_id', userId)
      .order('called_at', { ascending: false })
      .limit(limit);

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    const items = (logs || []).map((l: any) => ({
      id: l.id,
      feature: l.feature,
      provider: l.provider,
      pool_type: l.pool_type,
      cost_points: Number(l.requests_cost || 0),
      cost_credits: Number(((Number(l.requests_cost || 0)) / 100).toFixed(2)),
      called_at: l.called_at,
    }));

    return NextResponse.json(
      { items },
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
