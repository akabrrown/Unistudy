// In-memory sliding window rate limiter with automatic garbage collection
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();
const MAX_MEMORY_ENTRIES = 500;

function pruneExpiredMemoryStore(now: number): void {
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
  if (memoryStore.size > MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey !== undefined) {
      memoryStore.delete(oldestKey);
    }
  }
}

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check and record a rate limit attempt for a specific key (e.g. IP or IP+action)
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 5, windowSeconds: 15 * 60 }
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  // Check if Upstash Redis credentials exist for distributed multi-instance deployment
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      const { Ratelimit } = await import('@upstash/ratelimit');
      
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(options.limit, `${options.windowSeconds} s`),
        prefix: 'unistudy_ratelimit',
      });

      const res = await ratelimit.limit(key);
      return {
        success: res.success,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch (err) {
      console.warn('Upstash rate limiter fallback to in-memory store:', err);
    }
  }

  if (memoryStore.size > MAX_MEMORY_ENTRIES) {
    pruneExpiredMemoryStore(now);
  }

  // Resilient In-Memory Sliding Window
  let record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    memoryStore.set(key, record);
    return {
      success: true,
      remaining: options.limit - 1,
      reset: record.resetAt,
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: options.limit - record.count,
    reset: record.resetAt,
  };
}

