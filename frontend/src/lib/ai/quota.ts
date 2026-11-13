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

    return typeof data?.balance === 'number' ? data.balance : 0
  } catch (err) {
    console.warn('[Quota] Credit wallet lookup failed:', err instanceof Error ? err.message : err)
    return 0
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
  const provider = FEATURE_PROVIDER_MAP[feature]
  const cost = FEATURE_COSTS[feature]
  const config = PROVIDER_CONFIG[provider]

  if (!config.has_user_quota || !config.user_quota_column) {
    return { allowed: true, cost: 0, daily_used: 0, daily_limit: 9999, wallet_balance: 9999 }
  }

  const colPrefix = config.user_quota_column
  const dailyLimit = FREE_DAILY_ALLOWANCES[colPrefix] || 0

  const [quota, walletBalance] = await Promise.all([
    getUserQuota(userId),
    getCreditBalance(userId),
  ])

  // If the user_quota row hasn't been initialized yet, treat daily usage as 0 rather than locking out free allowance
  if (!quota) {
    const isAllowed = dailyLimit >= cost || walletBalance >= cost
    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : 'limit_reached',
      cost,
      daily_used: 0,
      daily_limit: dailyLimit,
      wallet_balance: walletBalance,
    }
  }

  const used = Number(quota[`${colPrefix}_daily_used`] || 0)
  const rawReset = quota[`${colPrefix}_daily_reset`]
  const resetsAt = new Date(
    typeof rawReset === 'string' || typeof rawReset === 'number' ? rawReset : Date.now()
  )
  resetsAt.setUTCDate(resetsAt.getUTCDate() + 1)
  resetsAt.setUTCHours(0, 0, 0, 0)

  const isNewPeriod = new Date() > resetsAt
  const actualUsed = isNewPeriod ? 0 : used
  const dailyRemaining = dailyLimit - actualUsed
  const isAllowed = dailyRemaining >= cost || walletBalance >= cost

  return {
    allowed: isAllowed,
    reason: isAllowed ? undefined : 'limit_reached',
    cost,
    daily_used: actualUsed,
    daily_limit: dailyLimit,
    wallet_balance: walletBalance,
  }
}

export async function consumeUserQuota(userId: string, feature: Feature): Promise<boolean> {
  const provider = FEATURE_PROVIDER_MAP[feature]
  const cost = FEATURE_COSTS[feature]
  if (cost <= 0) return true

  const config = PROVIDER_CONFIG[provider]
  if (!config.has_user_quota || !config.user_quota_column) {
    return true
  }

  const colPrefix = config.user_quota_column
  const dailyLimit = FREE_DAILY_ALLOWANCES[colPrefix] || 0

  const [quota, walletBalance] = await Promise.all([
    getUserQuota(userId),
    getCreditBalance(userId),
  ])

  const used = Number(quota?.[`${colPrefix}_daily_used`] || 0)
  const rawReset = quota?.[`${colPrefix}_daily_reset`]
  const resetsAt = new Date(
    typeof rawReset === 'string' || typeof rawReset === 'number' ? rawReset : Date.now()
  )
  resetsAt.setUTCDate(resetsAt.getUTCDate() + 1)
  resetsAt.setUTCHours(0, 0, 0, 0)
  const isNewPeriod = new Date() > resetsAt
  const actualUsed = isNewPeriod ? 0 : used
  const dailyRemaining = dailyLimit - actualUsed

  const supabase = await createClient()

  if (dailyRemaining >= cost) {
    const rpcName = `increment_user_${colPrefix}_daily`
    await supabase.rpc(rpcName as never, { p_user_id: userId, p_amount: cost } as never)
  } else if (walletBalance >= cost) {
    await supabase.rpc('decrement_credit_wallet', { p_user_id: userId, p_amount: cost })
  } else {
    throw new Error('quota_exhausted')
  }

  try {
    await supabase.from('ai_request_log').insert({
      user_id: userId,
      provider,
      feature,
      pool_type: config.pool_type,
      requests_cost: cost,
      was_cached: false,
      drew_from_pool: false,
      user_plan: 'credit_system',
    })
  } catch {
    // Non-fatal if RLS restricts client-scoped log insertion
  }

  await safeRedisDel(`user_quota:${userId}`)
  return true
}
