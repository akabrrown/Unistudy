"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalTelemetry = exports.PerformanceTelemetryCollector = exports.InFlightDeduplicator = exports.ExpensiveEndpointProtector = exports.TTLCache = void 0;
exports.classifyBotUserAgent = classifyBotUserAgent;
/**
 * Bounded in-memory TTL cache without background timers so serverless/idle instances stay asleep.
 */
class TTLCache {
    defaultTtlMs;
    maxEntries;
    store = new Map();
    constructor(defaultTtlMs, maxEntries = 500) {
        this.defaultTtlMs = defaultTtlMs;
        this.maxEntries = maxEntries;
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        const ttl = ttlMs ?? this.defaultTtlMs;
        if (ttl <= 0)
            return;
        if (this.store.has(key)) {
            this.store.delete(key);
        }
        else if (this.store.size >= this.maxEntries) {
            this.pruneExpiredOrOldest();
        }
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttl,
        });
    }
    delete(key) {
        this.store.delete(key);
    }
    invalidatePrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
    }
    pruneExpiredOrOldest() {
        const now = Date.now();
        for (const [k, v] of this.store.entries()) {
            if (now > v.expiresAt) {
                this.store.delete(k);
            }
        }
        if (this.store.size >= this.maxEntries) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey !== undefined) {
                this.store.delete(oldestKey);
            }
        }
    }
}
exports.TTLCache = TTLCache;
const MALICIOUS_SCANNERS = [
    'sqlmap',
    'nikto',
    'nuclei',
    'masscan',
    'zgrab',
    'gobuster',
    'dirbuster',
    'acunetix',
    'nessus',
    'wpscan',
];
const CRAWLER_SIGNATURES = [
    'python-requests',
    'scrapy',
    'curl/',
    'wget/',
    'headlesschrome',
    'gptbot',
    'ccbot',
    'bytespider',
    'claudebot',
    'semrushbot',
    'ahrefsbot',
    'mj12bot',
    'petalbot',
    'amazonbot',
    'anthropic-ai',
    'perplexitybot',
];
const ALLOWLISTED_BOT_PREFIXES = [
    '/ping',
    '/api/health',
    '/api/webhooks',
    '/api/cron',
];
/**
 * Classifies incoming requests by User-Agent and route path to block vulnerability scanners
 * and throttle scrapers hitting dynamic API endpoints.
 */
function classifyBotUserAgent(userAgent, path) {
    const normalizedPath = (path || '').toLowerCase();
    if (ALLOWLISTED_BOT_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
        return 'legitimate';
    }
    const normalizedUa = (userAgent || '').trim().toLowerCase();
    if (MALICIOUS_SCANNERS.some((sig) => normalizedUa.includes(sig))) {
        return 'malicious';
    }
    if (normalizedUa === '') {
        return normalizedPath.startsWith('/api') ? 'crawler' : 'legitimate';
    }
    if (CRAWLER_SIGNATURES.some((sig) => normalizedUa.includes(sig))) {
        return 'crawler';
    }
    return 'legitimate';
}
const NOOP_RELEASE = () => { };
/**
 * Protects expensive endpoints (AI generation, OCR, translation, Moodle sync)
 * using both per-key sliding-window rate limits and active concurrency caps.
 */
class ExpensiveEndpointProtector {
    options;
    buckets = new Map();
    maxKeys;
    constructor(options) {
        this.options = options;
        this.maxKeys = options.maxKeys ?? 1000;
    }
    acquire(key) {
        const now = Date.now();
        const cutoff = now - this.options.windowMs;
        let bucket = this.buckets.get(key);
        if (!bucket) {
            if (this.buckets.size >= this.maxKeys) {
                this.pruneStaleBuckets(cutoff);
            }
            bucket = { timestamps: [], activeCount: 0 };
            this.buckets.set(key, bucket);
        }
        else {
            bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
        }
        if (bucket.activeCount >= this.options.maxConcurrent) {
            return {
                allowed: false,
                reason: 'concurrency_limit',
                retryAfterSec: 5,
                release: NOOP_RELEASE,
            };
        }
        if (bucket.timestamps.length >= this.options.maxRequests) {
            const oldestInWindow = bucket.timestamps[0] ?? now;
            const waitMs = Math.max(1000, oldestInWindow + this.options.windowMs - now);
            return {
                allowed: false,
                reason: 'rate_limit',
                retryAfterSec: Math.ceil(waitMs / 1000),
                release: NOOP_RELEASE,
            };
        }
        bucket.timestamps.push(now);
        bucket.activeCount += 1;
        let released = false;
        return {
            allowed: true,
            retryAfterSec: 0,
            release: () => {
                if (released)
                    return;
                released = true;
                if (bucket && bucket.activeCount > 0) {
                    bucket.activeCount -= 1;
                }
            },
        };
    }
    pruneStaleBuckets(cutoff) {
        for (const [k, bucket] of this.buckets.entries()) {
            bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
            if (bucket.activeCount === 0 && bucket.timestamps.length === 0) {
                this.buckets.delete(k);
            }
        }
        if (this.buckets.size >= this.maxKeys) {
            const oldestKey = this.buckets.keys().next().value;
            if (oldestKey !== undefined) {
                this.buckets.delete(oldestKey);
            }
        }
    }
}
exports.ExpensiveEndpointProtector = ExpensiveEndpointProtector;
/**
 * Coalesces simultaneous identical async work into a single execution.
 */
class InFlightDeduplicator {
    inflight = new Map();
    run(key, fn) {
        const existing = this.inflight.get(key);
        if (existing) {
            return existing;
        }
        const promise = Promise.resolve()
            .then(() => fn())
            .finally(() => {
            if (this.inflight.get(key) === promise) {
                this.inflight.delete(key);
            }
        });
        this.inflight.set(key, promise);
        return promise;
    }
    get activeCount() {
        return this.inflight.size;
    }
}
exports.InFlightDeduplicator = InFlightDeduplicator;
function round2(n) {
    return Math.round(n * 100) / 100;
}
/**
 * Bounded in-process telemetry collector for API frequency, latency, CPU consumption,
 * requests per minute, and database query duration.
 */
class PerformanceTelemetryCollector {
    slowQueryThresholdMs;
    maxTrackedRoutes;
    maxTrackedDbTargets;
    totalRequests = 0;
    recentRequestTimestamps = [];
    routeStats = new Map();
    dbTargets = new Map();
    totalDbQueries = 0;
    totalDbDurationMs = 0;
    maxDbDurationMs = 0;
    slowDbQueryCount = 0;
    constructor(slowQueryThresholdMs = 250, maxTrackedRoutes = 200, maxTrackedDbTargets = 100) {
        this.slowQueryThresholdMs = slowQueryThresholdMs;
        this.maxTrackedRoutes = maxTrackedRoutes;
        this.maxTrackedDbTargets = maxTrackedDbTargets;
    }
    recordRequest(input) {
        const now = Date.now();
        this.totalRequests += 1;
        this.recentRequestTimestamps.push(now);
        if (this.recentRequestTimestamps.length > 5000) {
            const cutoff = now - 60_000;
            this.recentRequestTimestamps = this.recentRequestTimestamps.filter((t) => t > cutoff);
        }
        const key = `${input.method.toUpperCase()} ${input.route}`;
        const durationMs = Math.max(0, input.durationMs);
        const cpuMs = Math.max(0, input.cpuTimeMs ?? 0);
        const isError = input.statusCode >= 500;
        let acc = this.routeStats.get(key);
        if (!acc) {
            if (this.routeStats.size >= this.maxTrackedRoutes) {
                const oldestKey = this.routeStats.keys().next().value;
                if (oldestKey !== undefined) {
                    this.routeStats.delete(oldestKey);
                }
            }
            acc = {
                route: key,
                count: 0,
                totalDurationMs: 0,
                maxDurationMs: 0,
                totalCpuMs: 0,
                errorCount: 0,
            };
            this.routeStats.set(key, acc);
        }
        acc.count += 1;
        acc.totalDurationMs += durationMs;
        if (durationMs > acc.maxDurationMs)
            acc.maxDurationMs = durationMs;
        acc.totalCpuMs += cpuMs;
        if (isError)
            acc.errorCount += 1;
    }
    recordDbQuery(input) {
        const durationMs = Math.max(0, input.durationMs);
        const isSlow = durationMs >= this.slowQueryThresholdMs;
        this.totalDbQueries += 1;
        this.totalDbDurationMs += durationMs;
        if (durationMs > this.maxDbDurationMs)
            this.maxDbDurationMs = durationMs;
        if (isSlow)
            this.slowDbQueryCount += 1;
        let acc = this.dbTargets.get(input.target);
        if (!acc) {
            if (this.dbTargets.size >= this.maxTrackedDbTargets) {
                const oldestKey = this.dbTargets.keys().next().value;
                if (oldestKey !== undefined) {
                    this.dbTargets.delete(oldestKey);
                }
            }
            acc = {
                target: input.target,
                count: 0,
                totalDurationMs: 0,
                maxDurationMs: 0,
                slowCount: 0,
            };
            this.dbTargets.set(input.target, acc);
        }
        acc.count += 1;
        acc.totalDurationMs += durationMs;
        if (durationMs > acc.maxDurationMs)
            acc.maxDurationMs = durationMs;
        if (isSlow)
            acc.slowCount += 1;
    }
    getSnapshot() {
        const cutoff = Date.now() - 60_000;
        this.recentRequestTimestamps = this.recentRequestTimestamps.filter((t) => t > cutoff);
        const summaries = [...this.routeStats.values()].map((r) => ({
            route: r.route,
            count: r.count,
            avgDurationMs: round2(r.totalDurationMs / r.count),
            maxDurationMs: round2(r.maxDurationMs),
            totalCpuMs: round2(r.totalCpuMs),
            avgCpuMs: round2(r.totalCpuMs / r.count),
            errorCount: r.errorCount,
        }));
        const byTarget = [...this.dbTargets.values()]
            .map((t) => ({
            target: t.target,
            count: t.count,
            avgDurationMs: round2(t.totalDurationMs / t.count),
            maxDurationMs: round2(t.maxDurationMs),
            slowCount: t.slowCount,
        }))
            .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
            .slice(0, 20);
        return {
            totalRequests: this.totalRequests,
            requestsPerMinute: this.recentRequestTimestamps.length,
            mostFrequentRoutes: [...summaries].sort((a, b) => b.count - a.count).slice(0, 15),
            slowestEndpoints: [...summaries].sort((a, b) => b.avgDurationMs - a.avgDurationMs).slice(0, 15),
            cpuByRoute: [...summaries].sort((a, b) => b.totalCpuMs - a.totalCpuMs).slice(0, 15),
            database: {
                totalQueries: this.totalDbQueries,
                avgDurationMs: this.totalDbQueries > 0 ? round2(this.totalDbDurationMs / this.totalDbQueries) : 0,
                maxDurationMs: round2(this.maxDbDurationMs),
                slowQueryCount: this.slowDbQueryCount,
                byTarget,
            },
        };
    }
}
exports.PerformanceTelemetryCollector = PerformanceTelemetryCollector;
exports.globalTelemetry = new PerformanceTelemetryCollector();
