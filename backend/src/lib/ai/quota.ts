import { redis } from '../redis';
import { supabaseAdmin } from '../supabase';
import { Feature, FEATURE_PROVIDER_MAP, FEATURE_COSTS, PROVIDER_CONFIG, FREE_DAILY_ALLOWANCES, MODEL_MULTIPLIERS } from '@unistudy/shared/constants/quota';

export type QuotaCheckResult = {
  allowed: boolean
  reason?: 'limit_reached' | 'pool_disabled' | 'free_tier_suspended'
  cost: number
  daily_used: number
  daily_limit: number
  wallet_balance: number
}

export async function getCreditBalance(userId: string): Promise<number> {
  try {
    const { data } = await supabaseAdmin
      .from('credit_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data || typeof data.balance !== 'number') {
      try {
        await supabaseAdmin
          .from('credit_wallets')
          .upsert({
            user_id: userId,
            balance: 20,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        return 20;
      } catch (upsertErr) {
        console.warn('[Backend Quota] Auto-grant welcome bonus notice:', upsertErr);
        return 20;
      }
    }

    return data.balance;
  } catch (err) {
    console.warn('[Backend Quota] getCreditBalance fallback:', err);
    return 20;
  }
}

export async function getUserQuota(userId: string) {
  if (redis) {
    try {
      const cached = await redis.get(`user_quota:${userId}`);
      if (cached) return cached as any;
    } catch (e) {
      console.warn("Redis read failed:", e);
    }
  }

  const { data } = await supabaseAdmin.from('user_quota').select('*').eq('user_id', userId).single();

  let result = data;

  if (!result) {
    const { data: insertedData, error: insertErr } = await supabaseAdmin
      .from('user_quota')
      .insert({ user_id: userId })
      .select('*')
      .single();
    
    if (insertErr) {
      console.error("Failed to auto-create user_quota row:", insertErr);
    } else {
      result = insertedData;
    }
  }

  if (redis && result) {
    try {
      await redis.set(`user_quota:${userId}`, result, { ex: 30 });
    } catch (e) {
      console.warn("Redis write failed:", e);
    }
  }

  return result;
}

export async function checkUserQuota(userId: string, feature: Feature, model_tier: string = 'default'): Promise<QuotaCheckResult> {
  const cost = 1
  const walletBalance = await getCreditBalance(userId)
  const isAllowed = walletBalance >= cost

  return {
    allowed: isAllowed,
    reason: isAllowed ? undefined : 'limit_reached',
    cost,
    daily_used: 0,
    daily_limit: 0,
    wallet_balance: walletBalance
  }
}

export async function consumeUserQuota(userId: string, feature: Feature, model_tier: string = 'default') {
  const cost = 1
  const walletBalance = await getCreditBalance(userId)
  if (walletBalance < cost) {
    throw new Error('quota_exhausted')
  }

  const newBalance = Math.max(0, walletBalance - cost)

  try {
    await supabaseAdmin
      .from('credit_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    const provider = FEATURE_PROVIDER_MAP[feature] || 'gemini'
    await supabaseAdmin.from('ai_request_log').insert({
      user_id: userId,
      provider,
      feature,
      pool_type: 'credit_funded',
      requests_cost: cost,
      was_cached: false,
      drew_from_pool: false,
      user_plan: 'credit_system'
    })
  } catch (err) {
    console.warn('[Backend Quota] Direct balance update notice:', err)
    await supabaseAdmin.rpc('decrement_credit_wallet', { p_user_id: userId, p_amount: cost })
  }

  if (redis) {
    try {
      await redis.del(`user_quota:${userId}`)
    } catch (e) {
      console.warn("Redis delete failed:", e)
    }
  }

  return { success: true, remainingCredits: newBalance }
}
