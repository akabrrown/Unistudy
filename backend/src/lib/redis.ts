import { Redis } from '@upstash/redis';
import NodeCache from 'node-cache';
import { env } from '../config/env';

// Local in-memory cache as fallback when Upstash Redis is unreachable or during outages
const localCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

let isUpstashDisabled = false;
let lastFailureTime = 0;
let lastLogTime = 0;
const COOLDOWN_MS = 60_000; // Retry Upstash after 60 seconds

function isCircuitOpen(): boolean {
  if (!isUpstashDisabled) return false;
  if (Date.now() - lastFailureTime > COOLDOWN_MS) {
    return false;
  }
  return true;
}

function tripCircuit(err: any) {
  lastFailureTime = Date.now();
  if (!isUpstashDisabled || Date.now() - lastLogTime > COOLDOWN_MS) {
    isUpstashDisabled = true;
    lastLogTime = Date.now();
    console.warn(`[Redis] Upstash connection failed (${err?.message || err}). Falling back to in-memory cache.`);
  }
}

function resetCircuit() {
  if (isUpstashDisabled) {
    isUpstashDisabled = false;
    console.log('[Redis] Upstash connection restored. Resuming remote caching.');
  }
}

const rawRedis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export const redis = new Proxy(rawRedis, {
  get(target: any, prop: string | symbol, receiver: any) {
    if (prop === 'get') {
      return async (key: string) => {
        if (isCircuitOpen()) {
          return localCache.get(key) ?? null;
        }
        try {
          const val = await target.get(key);
          resetCircuit();
          return val;
        } catch (err: any) {
          tripCircuit(err);
          return localCache.get(key) ?? null;
        }
      };
    }

    if (prop === 'set') {
      return async (key: string, value: any, opts?: { ex?: number; px?: number }) => {
        const ttlSeconds = opts?.ex ?? (opts?.px ? Math.ceil(opts.px / 1000) : 0);
        localCache.set(key, value, ttlSeconds);
        if (isCircuitOpen()) {
          return 'OK';
        }
        try {
          const res = await target.set(key, value, opts);
          resetCircuit();
          return res;
        } catch (err: any) {
          tripCircuit(err);
          return 'OK';
        }
      };
    }

    if (prop === 'del') {
      return async (...keys: string[]) => {
        keys.forEach(k => localCache.del(k));
        if (isCircuitOpen()) {
          return keys.length;
        }
        try {
          const res = await target.del(...keys);
          resetCircuit();
          return res;
        } catch (err: any) {
          tripCircuit(err);
          return keys.length;
        }
      };
    }

    const orig = Reflect.get(target, prop, receiver);
    if (typeof orig === 'function') {
      return async (...args: any[]) => {
        if (isCircuitOpen()) {
          throw new Error('Upstash circuit open');
        }
        try {
          const res = await orig.apply(target, args);
          resetCircuit();
          return res;
        } catch (err: any) {
          tripCircuit(err);
          throw err;
        }
      };
    }
    return orig;
  }
}) as Redis;

