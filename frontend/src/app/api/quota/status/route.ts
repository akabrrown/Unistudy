import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 1. Try to proxy to Express backend if reachable
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${backendUrl}/api/quota/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (_backendErr) {
    // Backend asleep or unreachable - gracefully fall back to direct Supabase read
  }

  // 2. Direct Supabase read fallback
  try {
    const [walletRes, quotaRes] = await Promise.all([
      supabase.from('credit_wallets').select('balance').eq('user_id', userId).single(),
      supabase.from('user_quota').select('*').eq('user_id', userId).single(),
    ]);

    const walletBalance = walletRes.data?.balance ?? 50;
    const quota = quotaRes.data || {};

    const response = {
      wallet_balance: walletBalance,
      plan: 'credit_system',
      gemini: {
        daily_used: quota.gemini_daily_used || 0,
        daily_limit: 50,
        daily_resets_at: quota.gemini_daily_reset || null,
        locked: false,
      },
      groq_70b: {
        daily_used: quota.groq70_daily_used || 0,
        daily_limit: 30,
        daily_resets_at: quota.groq70_daily_reset || null,
        locked: false,
      },
      groq_8b: {
        daily_used: quota.groq8_daily_used || 0,
        daily_limit: 100,
        daily_resets_at: quota.groq8_daily_reset || null,
        locked: false,
      },
      cohere: {
        daily_used: quota.cohere_daily_used || 0,
        daily_limit: 100,
        daily_resets_at: quota.cohere_daily_reset || null,
        locked: false,
      },
      features: {},
    };

    return NextResponse.json(response);
  } catch (dbErr: any) {
    return NextResponse.json(
      { error: 'Failed to read quota balance', details: dbErr.message },
      { status: 500 }
    );
  }
}
