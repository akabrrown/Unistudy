import { createClient } from '@/lib/supabase/server'
import { Redis } from '@upstash/redis'
import {
  Feature,
  FEATURE_PROVIDER_MAP,
  FEATURE_COSTS,
  PROVIDER_CONFIG,
  FREE_DAILY_ALLOWANCES,
} from '../../../../shared/constants/quota'

const cleanEnv = (val?: string) => (val ? val.replace(/^["']|["']$/g, '').trim() : '')
const upstashUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL)
const upstashToken = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN)

export const redis =
  upstashUrl && upstashToken
    ? new Redis({
        url: upstashUrl,
        token: upstashToken,
      })
    : null

let upstashUnavailableUntil = 0
const UPSTASH_COOLDOWN_MS = 60_000

async function safeRedisGet<T>(key: string): Promise<T | null> {
  if (!redis || Date.now() < upstashUnavailableUntil) return null
  try {
    const val = await Promise.race([
      redis.get<T>(key),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Upstash Redis GET timeout')), 1500)
      ),
    ])
    return val ?? null
  } catch (err) {
    upstashUnavailableUntil = Date.now() + UPSTASH_COOLDOWN_MS
    console.warn('[Quota] Redis read bypassed:', err instanceof Error ? err.message : err)
    return null
  }
}

async function safeRedisSet(key: string, value: unknown, exSeconds: number): Promise<void> {
  if (!redis || Date.now() < upstashUnavailableUntil) return
  try {
    await Promise.race([
      redis.set(key, value, { ex: exSeconds }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Upstash Redis SET timeout')), 1500)
      ),
    ])
  } catch (err) {
    upstashUnavailableUntil = Date.now() + UPSTASH_COOLDOWN_MS
    console.warn('[Quota] Redis write bypassed:', err instanceof Error ? err.message : err)
  }
}

async function safeRedisDel(key: string): Promise<void> {
  if (!redis || Date.now() < upstashUnavailableUntil) return
  try {
    await Promise.race([
      redis.del(key),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Upstash Redis DEL timeout')), 1500)
      ),
    ])
  } catch (err) {
    upstashUnavailableUntil = Date.now() + UPSTASH_COOLDOWN_MS
    console.warn('[Quota] Redis delete bypassed:', err instanceof Error ? err.message : err)
  }
}

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
    const supabase = await createClient()
    const { data } = await supabase
      .from('credit_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data || typeof data.balance !== 'number') {
      try {
        const { getAdminClient } = await import('@/lib/supabase/admin')
        const admin = getAdminClient()
        await (admin.from('credit_wallets') as any).upsert({
          user_id: userId,
          balance: 20,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        return 20
      } catch {
        return 20
      }
    }

    return data.balance
  } catch (err) {
    console.warn('[Quota] Credit wallet lookup failed:', err instanceof Error ? err.message : err)
    return 20
  }
}

export async function getUserQuota(userId: string): Promise<Record<string, unknown> | null> {
  const cached = await safeRedisGet<Record<string, unknown>>(`user_quota:${userId}`)
  if (cached && typeof cached === 'object') {
    return cached
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_quota')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    let result: Record<string, unknown> | null = data as Record<string, unknown> | null

    if (!result) {
      const { data: insertedData } = await supabase
        .from('user_quota')
        .insert({ user_id: userId })
        .select('*')
        .maybeSingle()

      if (insertedData) {
        result = insertedData as Record<string, unknown>
      }
    }

    if (result) {
      await safeRedisSet(`user_quota:${userId}`, result, 30)
    }
    return result
  } catch (err) {
    console.warn('[Quota] User quota lookup failed:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function checkUserQuota(userId: string, feature: Feature): Promise<QuotaCheckResult> {
  const cost = 1
  const walletBalance = await getCreditBalance(userId)
  const isAllowed = walletBalance >= cost

  return {
    allowed: isAllowed,
    reason: isAllowed ? undefined : 'limit_reached',
    cost,
    daily_used: 0,
    daily_limit: 0,
    wallet_balance: walletBalance,
  }
}

export async function consumeUserQuota(
  userId: string,
  feature: Feature,
  cost: number = 1
): Promise<{ success: boolean; remainingCredits: number }> {
  const walletBalance = await getCreditBalance(userId)
  if (walletBalance < cost) {
    throw new Error('quota_exhausted')
  }

  const newBalance = Math.max(0, walletBalance - cost)

  try {
    const { getAdminClient } = await import('@/lib/supabase/admin')
    const admin = getAdminClient()
    await (admin.from('credit_wallets') as any).upsert({
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    const provider = FEATURE_PROVIDER_MAP[feature] || 'gemini'
    await (admin.from('ai_request_log') as any).insert({
      user_id: userId,
      provider,
      feature,
      pool_type: 'credit_funded',
      requests_cost: cost,
      was_cached: false,
      drew_from_pool: false,
      user_plan: 'credit_system',
    })
  } catch (adminErr) {
    console.warn('[consumeUserQuota] Admin update failed, attempting RPC fallback:', adminErr)
    const supabase = await createClient()
    await supabase.rpc('decrement_credit_wallet', { p_user_id: userId, p_amount: cost })
  }

  await safeRedisDel(`user_quota:${userId}`)
  return { success: true, remainingCredits: newBalance }
}

export async function deductUserCredits(
  userId: string,
  feature: string,
  provider: string = 'gemini',
  cost: number = 1
): Promise<{ allowed: boolean; remainingCredits: number; error?: string }> {
  try {
    const { getAdminClient } = await import('@/lib/supabase/admin')
    const admin = getAdminClient()

    const { data: walletRow } = await (admin.from('credit_wallets') as any)
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()

    let currentBalance: number
    if (!walletRow || typeof walletRow.balance !== 'number') {
      await (admin.from('credit_wallets') as any).upsert({
        user_id: userId,
        balance: 20,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      currentBalance = 20
    } else {
      currentBalance = walletRow.balance
    }

    if (currentBalance < cost) {
      return {
        allowed: false,
        remainingCredits: currentBalance,
        error: 'You have exhausted your AI Credits (0 remaining). Please top up in Billing to continue.',
      }
    }

    const newBalance = Math.max(0, currentBalance - cost)
    await (admin.from('credit_wallets') as any).upsert({
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    await (admin.from('ai_request_log') as any).insert({
      user_id: userId,
      provider,
      feature,
      pool_type: 'credit_funded',
      requests_cost: cost,
      was_cached: false,
      drew_from_pool: false,
      user_plan: 'credit_system',
    })

    await safeRedisDel(`user_quota:${userId}`)
    return { allowed: true, remainingCredits: newBalance }
  } catch (err: unknown) {
    console.error('[deductUserCredits] Error:', err)
    return { allowed: true, remainingCredits: 0 }
  }
}
