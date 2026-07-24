"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const ratelimit_1 = require("@upstash/ratelimit");
const redis_1 = require("../lib/redis");
// IP-based rate limiting (100 requests per 10 seconds)
const rateLimiter = new ratelimit_1.Ratelimit({
    redis: redis_1.redis,
    limiter: ratelimit_1.Ratelimit.slidingWindow(100, '10 s'),
    analytics: true,
    prefix: 'ratelimit:api',
});
async function rateLimit(req, res, next) {
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
    }
    catch (error) {
        // If Redis fails, allow the request to pass through to prevent system failure
        console.error('Rate limit error:', error);
        next();
    }
}
