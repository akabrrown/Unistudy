import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUserQuota, consumeUserQuota } from './quota'
import { Feature } from '../../../../shared/constants/quota'
import { checkCache } from './cache'

export function withAIQuota(feature: Feature, options: { skipCache?: boolean, identifiers?: string[] } = {}) {
  return function (handler: (req: Request, ...args: any[]) => Promise<Response>) {
    return async (req: Request, ...args: any[]) => {
      try {
        const supabase = await createClient()
        
        // 1. Authenticate user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 3. Quota check (Includes User Limits & Credits)
        const quotaStatus = await checkUserQuota(user.id, feature)
        
        if (!quotaStatus.allowed) {
          if (quotaStatus.reason === 'free_tier_suspended' || quotaStatus.reason === 'pool_disabled') {
            return NextResponse.json({
              error: 'platform_unavailable',
              reason: quotaStatus.reason,
              message: 'AI features are temporarily unavailable due to high demand.'
            }, { status: 503 })
          }

          // User limit hit
          return NextResponse.json({
            error: 'quota_exceeded',
            type: quotaStatus.reason,
            feature,
            plan: 'credit_system',
            cost: quotaStatus.cost,
            daily_used: quotaStatus.daily_used,
            daily_limit: quotaStatus.daily_limit,
            wallet_balance: quotaStatus.wallet_balance,
            remaining: 0,
            message: `You have exhausted your daily free allowance and do not have enough credits.`
          }, { status: 429 })
        }

        // 4. Check cache
        if (!options.skipCache && options.identifiers?.length) {
          const cachedResult = await checkCache(feature, ...options.identifiers)
          if (cachedResult) {
            return NextResponse.json({ data: cachedResult, cached: true })
          }
        }

        // 5. Execute Handler
        const response = await handler(req, ...args)

        // 6. Consume Quota on Success
        if (response.ok) {
          try {
            await consumeUserQuota(user.id, feature)
          } catch (e) {
            console.error("Quota consumption failed post-execution:", e)
          }
        }

        return response
      } catch (err: any) {
        console.error('API Error in withAIQuota:', err)
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
      }
    }
  }
}
