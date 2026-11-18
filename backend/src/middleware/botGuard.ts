import { Request, Response, NextFunction } from 'express';
import { classifyBotUserAgent } from '../../../shared/lib/cpuOptimization';

interface CrawlerBucket {
  count: number;
  resetAt: number;
}

const CRAWLER_WINDOW_MS = 60_000;
const CRAWLER_MAX_REQUESTS = 15;
const MAX_CRAWLER_ENTRIES = 1000;

const crawlerBuckets = new Map<string, CrawlerBucket>();

function pruneCrawlerBuckets(now: number): void {
  for (const [key, bucket] of crawlerBuckets.entries()) {
    if (now > bucket.resetAt) {
      crawlerBuckets.delete(key);
    }
  }
  if (crawlerBuckets.size >= MAX_CRAWLER_ENTRIES) {
    const oldestKey = crawlerBuckets.keys().next().value;
    if (oldestKey !== undefined) {
      crawlerBuckets.delete(oldestKey);
    }
  }
}

export function botGuard(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.get('user-agent') || '';
  const classification = classifyBotUserAgent(userAgent, req.path);

  if (classification === 'malicious') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (classification === 'crawler' && req.path.startsWith('/api')) {
    const now = Date.now();
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const existing = crawlerBuckets.get(ip);

    if (!existing || now > existing.resetAt) {
      if (crawlerBuckets.size >= MAX_CRAWLER_ENTRIES) {
        pruneCrawlerBuckets(now);
      }
      crawlerBuckets.set(ip, { count: 1, resetAt: now + CRAWLER_WINDOW_MS });
      return next();
    }

    existing.count += 1;
    if (existing.count > CRAWLER_MAX_REQUESTS) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({
        error: 'Too many automated requests',
        message: 'Scraper/bot traffic is rate-limited.',
      });
    }
  }

  next();
}
