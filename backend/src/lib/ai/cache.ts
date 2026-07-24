import { supabaseAdmin } from '../supabase';
import { Feature } from '../../../../shared/constants/quota';
import { redis } from '../redis';

export async function checkCache(feature: Feature, userId: string, ...identifiers: string[]) {
  try {
    switch (feature) {
      case 'slide_explanation': {
        const slideId = identifiers[0]
        const { data } = await supabaseAdmin.from('slides').select('explanation').eq('id', slideId).single()
        if (data?.explanation) {
          await logCacheHit(feature, userId)
          return data.explanation
        }
        return null
      }
      
      case 'daily_brief':
      case 'motivational_quote':
      case 'break_suggestion':
        // These are cached per day per user
        if (redis) {
          // identifiers[0] should be date YYYY-MM-DD
          const date = identifiers[0] 
          const val = await redis.get(`cache:${feature}:${userId}:${date}`)
          if (val) {
            await logCacheHit(feature, userId)
            return val
          }
        }
        return null

      default:
        return null;
    }
  } catch (error) {
    console.error("Cache lookup failed", error)
    return null;
  }
}

export async function setCache(feature: Feature, userId: string, result: any, ...identifiers: string[]) {
  try {
    switch (feature) {
      case 'slide_explanation': {
        const slideId = identifiers[0]
        await supabaseAdmin.from('slides').update({ explanation: result }).eq('id', slideId)
        break
      }
      case 'daily_brief':
      case 'motivational_quote':
      case 'break_suggestion':
        if (redis) {
          const date = identifiers[0]
          try {
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

export async function isCached(feature: Feature, userId: string, ...identifiers: string[]): Promise<boolean> {
  const result = await checkCache(feature, userId, ...identifiers)
  return result !== null
}

async function logCacheHit(feature: Feature, userId: string) {
  if (userId) {
    await supabaseAdmin.from('ai_request_log').insert({
      user_id: userId,
      provider: 'cache',
      feature,
      pool_type: 'none',
      requests_cost: 0,
      was_cached: true,
      drew_from_pool: false,
    })
  }
}
