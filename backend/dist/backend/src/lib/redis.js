"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.getCircuitState = getCircuitState;
const redis_1 = require("@upstash/redis");
const node_cache_1 = __importDefault(require("node-cache"));
const env_1 = require("../config/env");
// Local in-memory cache as fallback when Upstash Redis is unreachable or during outages
const localCache = new node_cache_1.default({ stdTTL: 60, checkperiod: 120 });
let circuitState = 'CLOSED';
let lastFailureTime = 0;
let lastLogTime = 0;
let consecutiveCanarySuccesses = 0;
const CANARY_SUCCESS_THRESHOLD = 3;
const COOLDOWN_MS = 60_000; // 60s cooldown in OPEN state before canary trial
function getCircuitState() {
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
    }
    else if (circuitState === 'CLOSED') {
        consecutiveCanarySuccesses = 0;
    }
}
function recordFailure(err) {
    lastFailureTime = Date.now();
    circuitState = 'OPEN';
    consecutiveCanarySuccesses = 0;
    if (Date.now() - lastLogTime > COOLDOWN_MS) {
        lastLogTime = Date.now();
        console.warn(`[Redis] Remote Upstash operation failed (${err?.message || err}). Circuit OPEN, routing to local in-memory cache.`);
    }
}
const rawRedis = new redis_1.Redis({
    url: env_1.env.UPSTASH_REDIS_REST_URL,
    token: env_1.env.UPSTASH_REDIS_REST_TOKEN,
});
exports.redis = new Proxy(rawRedis, {
    get(target, prop, receiver) {
        if (prop === 'get') {
            return async (key) => {
                if (getCircuitState() === 'OPEN') {
                    return localCache.get(key) ?? null;
                }
                try {
                    const val = await target.get(key);
                    recordSuccess();
                    return val;
                }
                catch (err) {
                    recordFailure(err);
                    return localCache.get(key) ?? null;
                }
            };
        }
        if (prop === 'set') {
            return async (key, value, opts) => {
                const ttlSeconds = opts?.ex ?? (opts?.px ? Math.ceil(opts.px / 1000) : 0);
                localCache.set(key, value, ttlSeconds);
                if (getCircuitState() === 'OPEN') {
                    return 'OK';
                }
                try {
                    const res = await target.set(key, value, opts);
                    recordSuccess();
                    return res;
                }
                catch (err) {
                    recordFailure(err);
                    return 'OK';
                }
            };
        }
        if (prop === 'del') {
            return async (...keys) => {
                keys.forEach(k => localCache.del(k));
                if (getCircuitState() === 'OPEN') {
                    return keys.length;
                }
                try {
                    const res = await target.del(...keys);
                    recordSuccess();
                    return res;
                }
                catch (err) {
                    recordFailure(err);
                    return keys.length;
                }
            };
        }
        const orig = Reflect.get(target, prop, receiver);
        if (typeof orig === 'function') {
            return async (...args) => {
                if (getCircuitState() === 'OPEN') {
                    throw new Error('Upstash circuit open');
                }
                try {
                    const res = await orig.apply(target, args);
                    recordSuccess();
                    return res;
                }
                catch (err) {
                    recordFailure(err);
                    throw err;
                }
            };
        }
        return orig;
    }
});
