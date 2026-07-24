import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const isRedisConfigured = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const mockRatelimit = {
  limit: async () => ({ success: true, pending: Promise.resolve(), limit: 10, remaining: 9, reset: 0 }),
} as any;

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = isRedisConfigured ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit',
}) : mockRatelimit;

// Specifically for high-cost operations (like AI generation, file uploads, checkout)
export const highCostRatelimit = isRedisConfigured ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit/high-cost',
}) : mockRatelimit;
