import { createClient } from '@/lib/supabase/server'
import { Feature } from '../../../../shared/constants/quota'
import { Redis } from '@upstash/redis'

const cleanEnv = (val?: string) => (val ? val.replace(/^["']|["']$/g, '').trim() : '')
const upstashUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL)
const upstashToken = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN)

const redis =
  upstashUrl && upstashToken
    ? new Redis({ url: upstashUrl, token: upstashToken })
    : null

export async function checkCache(feature: Feature, ...identifiers: string[]) {
  const supabase = await createClient()

  try {
    switch (feature) {
      case 'slide_explanation': {
        const slideId = identifiers[0]
        const { data } = await supabase
          .from('slides')
          .select('explanation')
          .eq('id', slideId)
          .single()
        if (data?.explanation) {
          await logCacheHit(feature)
          return data.explanation
        }
        return null
      }

      case 'daily_brief':
      case 'motivational_quote':
      case 'break_suggestion':
        if (redis) {
          const userId = identifiers[0]
          const date = identifiers[1]
          const val = await Promise.race([
            redis.get(`cache:${feature}:${userId}:${date}`),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('Redis cache GET timeout')), 1500)
            ),
          ])
          if (val) {
            await logCacheHit(feature)
            return val
          }
        }
        return null

      default:
        return null
    }
  } catch (error) {
    console.warn('Cache lookup bypassed:', error instanceof Error ? error.message : error)
    return null
  }
}

export async function setCache(feature: Feature, result: unknown, ...identifiers: string[]) {
  const supabase = await createClient()

  try {
    switch (feature) {
      case 'slide_explanation': {
        const slideId = identifiers[0]
        await supabase.from('slides').update({ explanation: result }).eq('id', slideId)
        break
      }
      case 'daily_brief':
      case 'motivational_quote':
      case 'break_suggestion':
        if (redis) {
          const userId = identifiers[0]
          const date = identifiers[1]
          try {
            await Promise.race([
              redis.set(`cache:${feature}:${userId}:${date}`, result, { ex: 86400 }),
              new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Redis cache SET timeout')), 1500)
              ),
            ])
          } catch (e) {
            console.warn('Redis write failed:', e instanceof Error ? e.message : e)
          }
        }
        break
    }
  } catch (error) {
    console.warn('Cache set bypassed:', error instanceof Error ? error.message : error)
  }
}

export async function isCached(feature: Feature, ...identifiers: string[]): Promise<boolean> {
  const result = await checkCache(feature, ...identifiers)
  return result !== null
}

async function logCacheHit(feature: Feature) {
  try {
    const supabase = await createClient()
    const { data: user } = await supabase.auth.getUser()

    if (user?.user) {
      await supabase.from('ai_request_log').insert({
        user_id: user.user.id,
        provider: 'cache',
        feature,
        pool_type: 'none',
        requests_cost: 0,
        was_cached: true,
        drew_from_pool: false,
      })
    }
  } catch {
    // Non-fatal
  }
}
