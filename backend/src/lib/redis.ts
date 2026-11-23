import { Redis } from '@upstash/redis';
import NodeCache from 'node-cache';
import { env } from '../config/env';

// Local in-memory cache as fallback when Upstash Redis is unreachable or during outages
const localCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Hystrix 3-State Circuit Breaker (CLOSED, OPEN, HALF_OPEN)
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
let circuitState: CircuitState = 'CLOSED';
let lastFailureTime = 0;
let lastLogTime = 0;
let consecutiveCanarySuccesses = 0;
const CANARY_SUCCESS_THRESHOLD = 3;
const COOLDOWN_MS = 60_000; // 60s cooldown in OPEN state before canary trial

export function getCircuitState(): CircuitState {
  if (circuitState === 'OPEN') {
    if (Date.now() - lastFailureTime > COOLDOWN_MS) {
      circuitState = 'HALF_OPEN';
      consecutiveCanarySuccesses = 0;
      console.log('[Redis] Circuit Breaker transitioned to HALF_OPEN. Sampling canary requests to remote Upstash...');
    }
  }
  return circuitState;
}

function recordSuccess() {
  if (circuitState === 'HALF_OPEN') {
    consecutiveCanarySuccesses++;
    if (consecutiveCanarySuccesses >= CANARY_SUCCESS_THRESHOLD) {
      circuitState = 'CLOSED';
      consecutiveCanarySuccesses = 0;
      console.log('[Redis] Remote Upstash canary probes succeeded (3/3). Circuit CLOSED (normal operation fully restored).');
    }
  } else if (circuitState === 'CLOSED') {
    consecutiveCanarySuccesses = 0;
  }
}

function recordFailure(err: any) {
  lastFailureTime = Date.now();
  circuitState = 'OPEN';
  consecutiveCanarySuccesses = 0;
  if (Date.now() - lastLogTime > COOLDOWN_MS) {
    lastLogTime = Date.now();
    console.warn(`[Redis] Remote Upstash operation failed (${err?.message || err}). Circuit OPEN, routing to local in-memory cache.`);
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
        if (getCircuitState() === 'OPEN') {
          return localCache.get(key) ?? null;
        }
        try {
          const val = await target.get(key);
          recordSuccess();
          return val;
        } catch (err: any) {
          recordFailure(err);
          return localCache.get(key) ?? null;
        }
      };
    }

    if (prop === 'set') {
      return async (key: string, value: any, opts?: { ex?: number; px?: number }) => {
        const ttlSeconds = opts?.ex ?? (opts?.px ? Math.ceil(opts.px / 1000) : 0);
        localCache.set(key, value, ttlSeconds);
        if (getCircuitState() === 'OPEN') {
          return 'OK';
        }
        try {
          const res = await target.set(key, value, opts);
          recordSuccess();
          return res;
        } catch (err: any) {
          recordFailure(err);
          return 'OK';
        }
      };
    }

    if (prop === 'del') {
      return async (...keys: string[]) => {
        keys.forEach(k => localCache.del(k));
        if (getCircuitState() === 'OPEN') {
          return keys.length;
        }
        try {
          const res = await target.del(...keys);
          recordSuccess();
          return res;
        } catch (err: any) {
          recordFailure(err);
          return keys.length;
        }
      };
    }

    const orig = Reflect.get(target, prop, receiver);
    if (typeof orig === 'function') {
      return async (...args: any[]) => {
        if (getCircuitState() === 'OPEN') {
          throw new Error('Upstash circuit open');
        }
        try {
          const res = await orig.apply(target, args);
          recordSuccess();
          return res;
        } catch (err: any) {
          recordFailure(err);
          throw err;
        }
      };
    }
    return orig;
  }
}) as Redis;

