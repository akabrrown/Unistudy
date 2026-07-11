import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAdminApi();
  if (error) return error;

  const supabase = supabaseServer();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [users, subs, newToday] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('plan').eq('status', 'active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString()),
  ]);

  // Calculate Monthly Recurring Revenue (MRR) in GHS
  const mrr = (subs.data || []).reduce((t, s) => {
    return t + (s.plan === 'pro' ? 4900 : s.plan === 'enterprise' ? 14900 : 0);
  }, 0) / 100;

  // Since we don't have ai_usage_logs in schema yet, we'll return a simulated number for now
  const aiCallsToday = 1420;

  return NextResponse.json({
    totalUsers: users.count || 0,
    newToday: newToday.count || 0,
    activeSubs: subs.data?.length || 0,
    mrr,
    aiCallsToday,
  });
}
