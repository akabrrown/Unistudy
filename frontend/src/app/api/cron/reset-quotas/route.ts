import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }) : null;

    // 1. Reset Platform Pools (Atomic RPC calls)
    await supabase.rpc('reset_daily_provider_pools')
    await supabase.rpc('reset_monthly_provider_pools')

    // 2. Reset User Daily Quotas (using bulk update)
    // In production with millions of users, this would be chunked
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('user_quota')
      .update({
        gemini_daily_used: 0,
        gemini_daily_reset: today,
        groq70_daily_used: 0,
        groq70_daily_reset: today,
        groq8_daily_used: 0,
        groq8_daily_reset: today,
        cohere_daily_used: 0,
        cohere_daily_reset: today,
        youtube_daily_used: 0,
        youtube_daily_reset: today
      })
      .lt('gemini_daily_reset', today)

    // Flush Redis quota caches
    if (redis) {
      // Very basic cache invalidation, in prod we might just let TTL expire
      // This ensures fresh reads post-cron
      const keys = await redis.keys('user_quota:*')
      if (keys.length > 0) {
        try {
          await redis.del(...keys)
        } catch (e) {
          console.warn("Redis bulk delete failed:", e)
        }
      }
    }

    return NextResponse.json({ success: true, message: 'All 9 provider quotas reset successfully' })

  } catch (error: any) {
    console.error('Cron error:', error)
    return new NextResponse(error.message, { status: 500 })
  }
}
