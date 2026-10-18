import { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '../lib/redis';

// IP-based rate limiting (100 requests per 10 seconds)
const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '10 s'),
  analytics: true,
  prefix: 'ratelimit:api',
});

// In-memory fallback tracking for when Upstash Redis is unreachable
const memoryRateMap = new Map<string, { count: number; resetAt: number }>();
let lastRateLimitLog = 0;

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const identifier = req.ip || req.headers['x-forwarded-for']?.toString() || 'anonymous';
  
  try {
    const { success, limit, remaining, reset } = await rateLimiter.limit(identifier);
    
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', reset.toString());

    if (!success) {
      return res.status(429).json({ 
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.'
      });
    }

    next();
  } catch (error: any) {
    // If Redis fails, throttle warning and fall back to in-memory window
    const now = Date.now();
    if (now - lastRateLimitLog > 60_000) {
      console.warn('[RateLimit] Upstash rate limit unavailable, falling back to in-memory rate limiting.');
      lastRateLimitLog = now;
    }

    const windowMs = 10_000;
    const maxLimit = 100;
    const entry = memoryRateMap.get(identifier);

    if (!entry || now > entry.resetAt) {
      memoryRateMap.set(identifier, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > maxLimit) {
        return res.status(429).json({ 
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.'
        });
      }
    }

    // Prune stale entries
    if (memoryRateMap.size > 2000) {
      for (const [key, val] of memoryRateMap.entries()) {
        if (now > val.resetAt) memoryRateMap.delete(key);
      }
    }

    next();
  }
}
