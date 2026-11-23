import { createClient } from '@/lib/supabase/server'
import { Redis } from '@upstash/redis'
import {
  Feature,
  FEATURE_PROVIDER_MAP,
  FEATURE_COSTS,
  PROVIDER_CONFIG,
  FREE_DAILY_ALLOWANCES,
  DUAL_TIER_CONFIG,
  DualTierWalletInfo,
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

// In-memory velocity guard fallback if Redis is unavailable
const velocityMap = new Map<string, { count: number; resetAt: number }>()

export async function checkVelocityLimit(userId: string): Promise<boolean> {
  const now = Date.now()
  const key = `rate_limit:ai:${userId}`

  if (redis && now >= upstashUnavailableUntil) {
    try {
      const current = await redis.incr(key)
      if (current === 1) {
        await redis.expire(key, 60)
      }
      return current <= DUAL_TIER_CONFIG.VELOCITY_MAX_PER_MINUTE
    } catch {
      // fallback to memory
    }
  }

  const record = velocityMap.get(userId)
  if (!record || now >= record.resetAt) {
    velocityMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  record.count += 1
  return record.count <= DUAL_TIER_CONFIG.VELOCITY_MAX_PER_MINUTE
}

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

export async function getDualTierWallet(userId: string): Promise<DualTierWalletInfo> {
  try {
    const { getAdminClient } = await import('@/lib/supabase/admin')
    const admin = getAdminClient()

    // Try calling the atomic DB function first
    const { data: rpcData, error: rpcErr } = await (admin.rpc as any)('get_or_refill_wallet', { p_user_id: userId })
    if (!rpcErr && rpcData && typeof rpcData === 'object') {
      const d = rpcData as Record<string, any>
      return {
        freePasses: Number(d.free_passes ?? 8),
        freePassesLimit: Number(d.free_passes_limit ?? 8),
        paidCredits: Number(d.paid_credits ?? 20),
        totalAvailable: Number(d.total_available ?? 28),
        tier: String(d.tier ?? 'free'),
        nextRefillAt: String(d.next_refill_at ?? new Date(Date.now() + DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS).toISOString()),
        secondsUntilRefill: Number(d.seconds_until_refill ?? 6 * 3600),
      }
    }

    // Direct query fallback with lazy 6h math
    const { data: walletRow } = await (admin.from('credit_wallets') as any)
      .select('balance, free_passes, free_passes_refreshed_at, tier')
      .eq('user_id', userId)
      .maybeSingle()

    const now = Date.now()
    const tier = walletRow?.tier === 'pro' ? 'pro' : 'free'
    const maxFree = tier === 'pro' ? DUAL_TIER_CONFIG.PRO_PASSES_LIMIT : DUAL_TIER_CONFIG.FREE_PASSES_LIMIT

    if (!walletRow) {
      await (admin.from('credit_wallets') as any).upsert({
        user_id: userId,
        balance: 20,
        free_passes: maxFree,
        free_passes_refreshed_at: new Date(now).toISOString(),
        tier,
        updated_at: new Date(now).toISOString(),
      }, { onConflict: 'user_id' })

      return {
        freePasses: maxFree,
        freePassesLimit: maxFree,
        paidCredits: 20,
        totalAvailable: maxFree + 20,
        tier,
        nextRefillAt: new Date(now + DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS).toISOString(),
        secondsUntilRefill: 6 * 3600,
      }
    }

    let freePasses = typeof walletRow.free_passes === 'number' ? walletRow.free_passes : maxFree
    let refreshedAt = walletRow.free_passes_refreshed_at
      ? new Date(walletRow.free_passes_refreshed_at).getTime()
      : 0

    if (now - refreshedAt >= DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS) {
      freePasses = maxFree
      refreshedAt = now
      await (admin.from('credit_wallets') as any).update({
        free_passes: maxFree,
        free_passes_refreshed_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      }).eq('user_id', userId)
    }

    const paidCredits = typeof walletRow.balance === 'number' ? walletRow.balance : 0
    const nextRefill = refreshedAt + DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS
    const secondsUntilRefill = Math.max(0, Math.floor((nextRefill - now) / 1000))

    return {
      freePasses,
      freePassesLimit: maxFree,
      paidCredits,
      totalAvailable: freePasses + paidCredits,
      tier,
      nextRefillAt: new Date(nextRefill).toISOString(),
      secondsUntilRefill,
    }
  } catch (err) {
    console.warn('[getDualTierWallet] Fallback notice:', err instanceof Error ? err.message : err)
    return {
      freePasses: 8,
      freePassesLimit: 8,
      paidCredits: 20,
      totalAvailable: 28,
      tier: 'free',
      nextRefillAt: new Date(Date.now() + DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS).toISOString(),
      secondsUntilRefill: 6 * 3600,
    }
  }
}

export async function getCreditBalance(userId: string): Promise<number> {
  const wallet = await getDualTierWallet(userId)
  return wallet.totalAvailable
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
  const wallet = await getDualTierWallet(userId)
  const isAllowed = wallet.totalAvailable >= cost

  return {
    allowed: isAllowed,
    reason: isAllowed ? undefined : 'limit_reached',
    cost,
    daily_used: 0,
    daily_limit: 0,
    wallet_balance: wallet.totalAvailable,
  }
}

export async function consumeUserQuota(
  userId: string,
  feature: Feature,
  cost: number = 1
): Promise<{ success: boolean; remainingCredits: number }> {
  const result = await deductUserCredits(userId, feature, FEATURE_PROVIDER_MAP[feature] || 'gemini', cost)
  if (!result.allowed) {
    throw new Error('quota_exhausted')
  }
  return { success: true, remainingCredits: result.remainingCredits }
}

export async function deductUserCredits(
  userId: string,
  feature: string,
  provider: string = 'gemini',
  cost: number = 1
): Promise<{
  allowed: boolean
  remainingCredits: number
  freePasses: number
  paidCredits: number
  secondsUntilRefill: number
  deductedFrom?: 'free' | 'paid' | 'mixed'
  error?: string
}> {
  try {
    // 1. Anti-Bot Velocity Limiter check
    const isVelocityAllowed = await checkVelocityLimit(userId)
    if (!isVelocityAllowed) {
      return {
        allowed: false,
        remainingCredits: 0,
        freePasses: 0,
        paidCredits: 0,
        secondsUntilRefill: 60,
        error: 'Too many requests in a short period. Please slow down and try again in a few moments.',
      }
    }

    const { getAdminClient } = await import('@/lib/supabase/admin')
    const admin = getAdminClient()

    // 2. Try the atomic database RPC function first
    try {
      const { data: rpcRes, error: rpcErr } = await (admin.rpc as any)('consume_ai_credit_dual_tier', {
        p_user_id: userId,
        p_amount: cost,
      })

      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        const d = rpcRes as Record<string, any>
        if (d.allowed === false) {
          const hours = Math.floor(d.seconds_until_refill / 3600)
          const mins = Math.floor((d.seconds_until_refill % 3600) / 60)
          return {
            allowed: false,
            remainingCredits: 0,
            freePasses: Number(d.free_passes ?? 0),
            paidCredits: Number(d.paid_credits ?? 0),
            secondsUntilRefill: Number(d.seconds_until_refill ?? 0),
            error: `You have exhausted your Free Passes and Paid Credits. Free passes refill in ${hours}h ${mins}m, or top up with a credit bundle to continue immediately.`,
          }
        }

        // Audit log
        try {
          await (admin.from('ai_request_log') as any).insert({
            user_id: userId,
            provider,
            feature,
            pool_type: d.deducted_from === 'free' ? 'free_daily' : 'credit_funded',
            requests_cost: cost,
            was_cached: false,
            drew_from_pool: d.deducted_from === 'free',
            user_plan: 'credit_system',
          })
        } catch {
          // Log failure is non-blocking
        }

        await safeRedisDel(`user_quota:${userId}`)

        return {
          allowed: true,
          remainingCredits: Number(d.total_available ?? 0),
          freePasses: Number(d.free_passes ?? 0),
          paidCredits: Number(d.paid_credits ?? 0),
          secondsUntilRefill: Number(d.seconds_until_refill ?? 0),
          deductedFrom: d.deducted_from,
        }
      }
    } catch (rpcCallErr) {
      console.warn('[deductUserCredits] RPC call warning, using JS fallback:', rpcCallErr)
    }

    // 3. Fallback JS Dual-Tier deduction
    const wallet = await getDualTierWallet(userId)
    if (wallet.totalAvailable < cost) {
      const hours = Math.floor(wallet.secondsUntilRefill / 3600)
      const mins = Math.floor((wallet.secondsUntilRefill % 3600) / 60)
      return {
        allowed: false,
        remainingCredits: wallet.totalAvailable,
        freePasses: wallet.freePasses,
        paidCredits: wallet.paidCredits,
        secondsUntilRefill: wallet.secondsUntilRefill,
        error: `You have exhausted your Free Passes and Paid Credits. Free passes refill in ${hours}h ${mins}m, or top up with a credit bundle to continue immediately.`,
      }
    }

    let newFree = wallet.freePasses
    let newPaid = wallet.paidCredits
    let deductedFrom: 'free' | 'paid' | 'mixed' = 'free'

    if (newFree >= cost) {
      newFree -= cost
      deductedFrom = 'free'
    } else if (newFree > 0) {
      const rem = cost - newFree
      newFree = 0
      newPaid = Math.max(0, newPaid - rem)
      deductedFrom = 'mixed'
    } else {
      newPaid = Math.max(0, newPaid - cost)
      deductedFrom = 'paid'
    }

    await (admin.from('credit_wallets') as any).upsert({
      user_id: userId,
      free_passes: newFree,
      balance: newPaid,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    try {
      await (admin.from('ai_request_log') as any).insert({
        user_id: userId,
        provider,
        feature,
        pool_type: deductedFrom === 'free' ? 'free_daily' : 'credit_funded',
        requests_cost: cost,
        was_cached: false,
        drew_from_pool: deductedFrom === 'free',
        user_plan: 'credit_system',
      })
    } catch {
      // Log failure is non-blocking
    }

    await safeRedisDel(`user_quota:${userId}`)

    return {
      allowed: true,
      remainingCredits: newFree + newPaid,
      freePasses: newFree,
      paidCredits: newPaid,
      secondsUntilRefill: wallet.secondsUntilRefill,
      deductedFrom,
    }
  } catch (err: unknown) {
    console.error('[deductUserCredits] Error:', err)
    return {
      allowed: true,
      remainingCredits: 1,
      freePasses: 1,
      paidCredits: 0,
      secondsUntilRefill: 0,
    }
  }
}
