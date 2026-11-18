import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ExpensiveEndpointProtector } from '../../../shared/lib/cpuOptimization';

const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const fallbackStandardProtector = new ExpensiveEndpointProtector({
  maxRequests: 10,
  windowMs: 10_000,
  maxConcurrent: 6,
});

const fallbackHighCostProtector = new ExpensiveEndpointProtector({
  maxRequests: 8,
  windowMs: 60_000,
  maxConcurrent: 3,
});

function createFallbackLimiter(protector: ExpensiveEndpointProtector, maxRequests: number) {
  return {
    limit: async (identifier: string) => {
      const res = protector.acquire(identifier);
      res.release();
      return {
        success: res.allowed,
        pending: Promise.resolve(),
        limit: maxRequests,
        remaining: res.allowed ? 1 : 0,
        reset: Date.now() + res.retryAfterSec * 1000,
      };
    },
  } as unknown as Ratelimit;
}

const upstashStandard = isRedisConfigured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    })
  : null;

const upstashHighCost = isRedisConfigured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: '@upstash/ratelimit/high-cost',
    })
  : null;

const fallbackStandardLimiter = createFallbackLimiter(fallbackStandardProtector, 10);
const fallbackHighCostLimiter = createFallbackLimiter(fallbackHighCostProtector, 8);

export const ratelimit = {
  limit: async (identifier: string) => {
    if (upstashStandard) {
      try {
        return await upstashStandard.limit(identifier);
      } catch {
        // Fall through to bounded in-memory limiter when Upstash is unreachable
      }
    }
    return fallbackStandardLimiter.limit(identifier);
  },
};

export const highCostRatelimit = {
  limit: async (identifier: string) => {
    if (upstashHighCost) {
      try {
        return await upstashHighCost.limit(identifier);
      } catch {
        // Fall through to bounded in-memory limiter when Upstash is unreachable
      }
    }
    return fallbackHighCostLimiter.limit(identifier);
  },
};

export async function enforceHighCostLimit(
  identifier: string
): Promise<{ allowed: boolean; retryAfterSec: number; release: () => void }> {
  const key = identifier || 'anonymous';
  const local = fallbackHighCostProtector.acquire(key);
  if (!local.allowed) {
    return {
      allowed: false,
      retryAfterSec: local.retryAfterSec,
      release: local.release,
    };
  }

  if (upstashHighCost) {
    try {
      const remote = await upstashHighCost.limit(key);
      if (!remote.success) {
        local.release();
        const waitMs = Math.max(1000, remote.reset - Date.now());
        return {
          allowed: false,
          retryAfterSec: Math.ceil(waitMs / 1000),
          release: () => {},
        };
      }
    } catch {
      // Redis unavailable; rely on local concurrency & sliding-window guard already acquired
    }
  }

  return {
    allowed: true,
    retryAfterSec: 0,
    release: local.release,
  };
}
