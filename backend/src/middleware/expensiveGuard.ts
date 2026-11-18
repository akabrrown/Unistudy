import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { ExpensiveEndpointProtector, InFlightDeduplicator } from '../../../shared/lib/cpuOptimization';

interface BufferedResponse {
  passthrough: boolean;
  status: number;
  body: unknown;
  isJson: boolean;
}

export function protectExpensiveEndpoint(options?: {
  maxPerMinute?: number;
  maxConcurrent?: number;
}) {
  const protector = new ExpensiveEndpointProtector({
    maxRequests: options?.maxPerMinute ?? 10,
    windowMs: 60_000,
    maxConcurrent: options?.maxConcurrent ?? 2,
  });

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.id || req.ip || req.headers['x-forwarded-for']?.toString() || 'anon';
    const result = protector.acquire(key);

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSec));
      return res.status(429).json({
        error: result.reason || 'rate_limit',
        message:
          result.reason === 'concurrency_limit'
            ? 'Another request is still running for your account. Please wait a moment.'
            : 'Too many requests to this endpoint. Please slow down and try again shortly.',
        retryAfter: result.retryAfterSec,
      });
    }

    res.on('finish', result.release);
    res.on('close', result.release);
    next();
  };
}

function buildRequestKey(req: Request): string {
  const identity = req.user?.id || req.ip || 'anon';
  const path = `${req.baseUrl || ''}${req.path || ''}`;
  let bodyHash = 'empty';
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && typeof req.body === 'object') {
    try {
      bodyHash = createHash('sha256').update(JSON.stringify(req.body)).digest('hex').slice(0, 16);
    } catch {
      bodyHash = 'unserializable';
    }
  }
  const queryPart = req.originalUrl?.includes('?') ? req.originalUrl.split('?')[1] : '';
  return `${identity}:${req.method}:${path}:${queryPart}:${bodyHash}`;
}

export function deduplicateInFlightRequests(options?: { methods?: string[] }) {
  const dedup = new InFlightDeduplicator<string, BufferedResponse>();
  const allowedMethods = new Set((options?.methods || ['GET', 'POST']).map((m) => m.toUpperCase()));
  const activeLeaderKeys = new Set<string>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedMethods.has(req.method.toUpperCase())) {
      return next();
    }
    if (
      req.is('multipart/form-data') ||
      req.body?.stream === true ||
      req.body?.payload?.stream === true ||
      /explain-slide|stream/i.test(req.path) ||
      req.headers.accept?.includes('text/event-stream')
    ) {
      return next();
    }

    const key = buildRequestKey(req);

    // If a leader is already executing for this exact key, coalesce and replay its result
    if (activeLeaderKeys.has(key)) {
      void dedup
        .run(key, async () => ({ passthrough: true, status: 200, body: null, isJson: false }))
        .then((buffered) => {
          if (res.headersSent) return;
          if (buffered.passthrough) {
            return next();
          }
          if (buffered.isJson) {
            return res.status(buffered.status).json(buffered.body);
          }
          return res.status(buffered.status).send(buffered.body);
        })
        .catch(() => {
          if (!res.headersSent) next();
        });
      return;
    }

    activeLeaderKeys.add(key);

    void dedup
      .run(
        key,
        () =>
          new Promise<BufferedResponse>((resolve) => {
            let settled = false;
            const origJson = res.json.bind(res);
            const origSend = res.send.bind(res);

            const finishWith = (payload: BufferedResponse) => {
              if (!settled) {
                settled = true;
                activeLeaderKeys.delete(key);
                resolve(payload);
              }
            };

            res.json = ((body?: unknown) => {
              finishWith({
                passthrough: false,
                status: res.statusCode || 200,
                body,
                isJson: true,
              });
              return origJson(body);
            }) as typeof res.json;

            res.send = ((body?: unknown) => {
              finishWith({
                passthrough: false,
                status: res.statusCode || 200,
                body,
                isJson: false,
              });
              return origSend(body);
            }) as typeof res.send;

            const fallbackSettle = () => {
              finishWith({
                passthrough: true,
                status: res.statusCode || 200,
                body: null,
                isJson: false,
              });
            };

            res.on('finish', fallbackSettle);
            res.on('close', fallbackSettle);

            next();
          })
      )
      .catch(() => {
        activeLeaderKeys.delete(key);
      });
  };
}
