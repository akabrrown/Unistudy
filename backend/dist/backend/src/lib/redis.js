"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("@upstash/redis");
const node_cache_1 = __importDefault(require("node-cache"));
const env_1 = require("../config/env");
// Local in-memory cache as fallback when Upstash Redis is unreachable or during outages
const localCache = new node_cache_1.default({ stdTTL: 60, checkperiod: 120 });
let isUpstashDisabled = false;
let lastFailureTime = 0;
let lastLogTime = 0;
const COOLDOWN_MS = 60_000; // Retry Upstash after 60 seconds
function isCircuitOpen() {
    if (!isUpstashDisabled)
        return false;
    if (Date.now() - lastFailureTime > COOLDOWN_MS) {
        return false;
    }
    return true;
}
function tripCircuit(err) {
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
const rawRedis = new redis_1.Redis({
    url: env_1.env.UPSTASH_REDIS_REST_URL,
    token: env_1.env.UPSTASH_REDIS_REST_TOKEN,
});
exports.redis = new Proxy(rawRedis, {
    get(target, prop, receiver) {
        if (prop === 'get') {
            return async (key) => {
                if (isCircuitOpen()) {
                    return localCache.get(key) ?? null;
                }
                try {
                    const val = await target.get(key);
                    resetCircuit();
                    return val;
                }
                catch (err) {
                    tripCircuit(err);
                    return localCache.get(key) ?? null;
                }
            };
        }
        if (prop === 'set') {
            return async (key, value, opts) => {
                const ttlSeconds = opts?.ex ?? (opts?.px ? Math.ceil(opts.px / 1000) : 0);
                localCache.set(key, value, ttlSeconds);
                if (isCircuitOpen()) {
                    return 'OK';
                }
                try {
                    const res = await target.set(key, value, opts);
                    resetCircuit();
                    return res;
                }
                catch (err) {
                    tripCircuit(err);
                    return 'OK';
                }
            };
        }
        if (prop === 'del') {
            return async (...keys) => {
                keys.forEach(k => localCache.del(k));
                if (isCircuitOpen()) {
                    return keys.length;
                }
                try {
                    const res = await target.del(...keys);
                    resetCircuit();
                    return res;
                }
                catch (err) {
                    tripCircuit(err);
                    return keys.length;
                }
            };
        }
        const orig = Reflect.get(target, prop, receiver);
        if (typeof orig === 'function') {
            return async (...args) => {
                if (isCircuitOpen()) {
                    throw new Error('Upstash circuit open');
                }
                try {
                    const res = await orig.apply(target, args);
                    resetCircuit();
                    return res;
                }
                catch (err) {
                    tripCircuit(err);
                    throw err;
                }
            };
        }
        return orig;
    }
});
