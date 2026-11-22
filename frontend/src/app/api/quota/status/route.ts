import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export const dynamic = 'force-dynamic';

const FREE_DAILY_ALLOWANCES: Record<string, number> = {
  gemini: 5000,
  groq70: 1000,
  groq8: 2000,
  cohere: 0,
  youtube: 300,
};

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    // Fetch wallet, user quota, and ai_request_log metrics in parallel
    const [walletRes, quotaRes, logsRes] = await Promise.all([
      supabase.from('credit_wallets').select('balance').eq('user_id', userId).maybeSingle(),
      supabase.from('user_quota').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('ai_request_log')
        .select('requests_cost, called_at, feature, provider, pool_type')
        .eq('user_id', userId)
        .order('called_at', { ascending: false })
        .limit(300),
    ]);

    const walletBalance = walletRes.data?.balance ?? 0;
    const quota = quotaRes.data || {};
    const logs = logsRes.data || [];

    // Aggregate lifetime & today's compute consumption
    let totalLifetimePoints = 0;
    let totalTodayPoints = 0;
    const featureBreakdown: Record<string, { count: number; points: number; credits: number }> = {};

    for (const log of logs) {
      const cost = Number(log.requests_cost || 0);
      totalLifetimePoints += cost;

      const calledAt = new Date(log.called_at);
      if (calledAt >= todayStart) {
        totalTodayPoints += cost;
      }

      const feat = log.feature || 'other';
      if (!featureBreakdown[feat]) {
        featureBreakdown[feat] = { count: 0, points: 0, credits: 0 };
      }
      featureBreakdown[feat].count += 1;
      featureBreakdown[feat].points += cost;
      featureBreakdown[feat].credits = Number((featureBreakdown[feat].points / 100).toFixed(2));
    }

    // Resolves provider daily pools with UTC midnight date reset verification
    const resolvePoolUsage = (prefix: string, colUsedName: string, colResetName: string) => {
      const limit = FREE_DAILY_ALLOWANCES[prefix] || 0;
      const rawUsed = Number(quota[colUsedName] || 0);
      const rawReset = quota[colResetName];

      let isNewPeriod = true;
      let resetsAtDate: Date | null = null;
      if (rawReset) {
        resetsAtDate = new Date(rawReset);
        resetsAtDate.setUTCDate(resetsAtDate.getUTCDate() + 1);
        resetsAtDate.setUTCHours(0, 0, 0, 0);
        isNewPeriod = now > resetsAtDate;
      }

      const actualUsed = isNewPeriod ? 0 : rawUsed;
      const remaining = Math.max(0, limit - actualUsed);
      const percentage = limit > 0 ? Math.min(100, Math.round((actualUsed / limit) * 100)) : 100;

      return {
        daily_used: actualUsed,
        daily_limit: limit,
        daily_remaining: remaining,
        percentage_used: percentage,
        daily_resets_at: resetsAtDate ? resetsAtDate.toISOString() : null,
        locked: false,
      };
    };

    const response = {
      wallet_balance: walletBalance,
      wallet_credits: Number((walletBalance / 100).toFixed(2)),
      plan: 'credit_system',
      usage_summary: {
        points_used_today: totalTodayPoints,
        credits_used_today: Number((totalTodayPoints / 100).toFixed(2)),
        points_used_lifetime: totalLifetimePoints,
        credits_used_lifetime: Number((totalLifetimePoints / 100).toFixed(2)),
        total_operations_recorded: logs.length,
      },
      features_breakdown: featureBreakdown,
      gemini: resolvePoolUsage('gemini', 'gemini_daily_used', 'gemini_daily_reset'),
      groq_70b: resolvePoolUsage('groq70', 'groq70_daily_used', 'groq70_daily_reset'),
      groq_8b: resolvePoolUsage('groq8', 'groq8_daily_used', 'groq8_daily_reset'),
      youtube: resolvePoolUsage('youtube', 'youtube_daily_used', 'youtube_daily_reset'),
      cohere: resolvePoolUsage('cohere', 'cohere_daily_used', 'cohere_daily_reset'),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (dbErr: any) {
    return NextResponse.json(
      { error: 'Failed to read quota balance', details: dbErr.message },
      { status: 500 }
    );
  }
}
