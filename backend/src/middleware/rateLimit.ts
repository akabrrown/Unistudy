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

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    // Use IP or fallback to 'anonymous'
    const identifier = req.ip || req.headers['x-forwarded-for']?.toString() || 'anonymous';
    
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
  } catch (error) {
    // If Redis fails, allow the request to pass through to prevent system failure
    console.error('Rate limit error:', error);
    next();
  }
}
