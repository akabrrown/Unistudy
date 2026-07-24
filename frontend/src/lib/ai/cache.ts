import { createClient } from '@/lib/supabase/server'
import { Feature } from '../../../../shared/constants/quota'
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

export async function checkCache(feature: Feature, ...identifiers: string[]) {
  const supabase = await createClient()

  try {
    switch (feature) {
      case 'slide_explanation': {
        const slideId = identifiers[0]
        const { data } = await supabase.from('slides').select('explanation').eq('id', slideId).single()
        if (data?.explanation) {
          await logCacheHit(feature)
          return data.explanation
        }
        return null
      }
      
      case 'daily_brief':
      case 'motivational_quote':
      case 'break_suggestion':
        // These are cached per day per user
        if (redis) {
          const userId = identifiers[0]
          const date = identifiers[1] // YYYY-MM-DD
          const val = await redis.get(`cache:${feature}:${userId}:${date}`)
          if (val) {
            await logCacheHit(feature)
            return val
          }
        }
        return null

      // Add other cases as needed
      default:
        return null;
    }
  } catch (error) {
    console.error("Cache lookup failed", error)
    return null;
  }
}

export async function setCache(feature: Feature, result: any, ...identifiers: string[]) {
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
        // These are cached per day per user
        if (redis) {
          const userId = identifiers[0]
          const date = identifiers[1] // YYYY-MM-DD
          try {
            // cache for 24h
            await redis.set(`cache:${feature}:${userId}:${date}`, result, { ex: 86400 })
          } catch (e) {
            console.warn("Redis write failed:", e);
          }
        }
        break
    }
  } catch (error) {
    console.error("Cache set failed", error)
  }
}

export async function isCached(feature: Feature, ...identifiers: string[]): Promise<boolean> {
  const result = await checkCache(feature, ...identifiers)
  return result !== null
}

async function logCacheHit(feature: Feature) {
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
}
