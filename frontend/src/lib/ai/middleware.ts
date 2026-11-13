import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUserQuota, consumeUserQuota, type QuotaCheckResult } from './quota'
import { Feature } from '../../../../shared/constants/quota'
import { checkCache } from './cache'

export function withAIQuota(
  feature: Feature,
  options: { skipCache?: boolean; identifiers?: string[] } = {}
) {
  return function (handler: (req: Request, ...args: unknown[]) => Promise<Response>) {
    return async (req: Request, ...args: unknown[]) => {
      try {
        const supabase = await createClient()

        // 1. Authenticate user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Quota check (resilient to transient Redis / quota table errors)
        let quotaStatus: QuotaCheckResult = {
          allowed: true,
          cost: 0,
          daily_used: 0,
          daily_limit: 5000,
          wallet_balance: 0,
        }
        try {
          quotaStatus = await checkUserQuota(user.id, feature)
        } catch (quotaErr) {
          console.warn(`[withAIQuota] Quota check degraded for ${feature}, continuing:`, quotaErr)
        }

        if (!quotaStatus.allowed) {
          if (
            quotaStatus.reason === 'free_tier_suspended' ||
            quotaStatus.reason === 'pool_disabled'
          ) {
            return NextResponse.json(
              {
                error: 'platform_unavailable',
                reason: quotaStatus.reason,
                message: 'AI features are temporarily unavailable due to high demand.',
              },
              { status: 503 }
            )
          }

          return NextResponse.json(
            {
              error: 'quota_exceeded',
              type: quotaStatus.reason,
              feature,
              plan: 'credit_system',
              cost: quotaStatus.cost,
              daily_used: quotaStatus.daily_used,
              daily_limit: quotaStatus.daily_limit,
              wallet_balance: quotaStatus.wallet_balance,
              remaining: 0,
              message:
                'You have exhausted your daily free allowance and do not have enough credits.',
            },
            { status: 429 }
          )
        }

        // 3. Check cache
        if (!options.skipCache && options.identifiers?.length) {
          try {
            const cachedResult = await checkCache(feature, ...options.identifiers)
            if (cachedResult) {
              return NextResponse.json({ data: cachedResult, cached: true })
            }
          } catch (cacheErr) {
            console.warn(`[withAIQuota] Cache check bypassed for ${feature}:`, cacheErr)
          }
        }

        // 4. Execute Handler
        const response = await handler(req, ...args)

        // 5. Consume Quota asynchronously so streaming responses start immediately
        if (response.ok) {
          consumeUserQuota(user.id, feature).catch((e) => {
            console.warn('Quota consumption warning post-execution:', e)
          })
        }

        return response
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Server Error'
        console.error('API Error in withAIQuota:', err)
        return NextResponse.json(
          { error: message || 'Internal Server Error', details: message },
          { status: 500 }
        )
      }
    }
  }
}
