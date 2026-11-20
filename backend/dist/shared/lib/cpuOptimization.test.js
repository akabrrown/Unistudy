"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const cpuOptimization_1 = require("./cpuOptimization");
(0, node_test_1.test)('TTLCache stores and retrieves values within TTL', () => {
    const cache = new cpuOptimization_1.TTLCache(1000, 10);
    cache.set('k1', 'v1');
    strict_1.default.equal(cache.get('k1'), 'v1');
    strict_1.default.equal(cache.get('missing'), undefined);
});
(0, node_test_1.test)('TTLCache expires entries after TTL elapses', async () => {
    const cache = new cpuOptimization_1.TTLCache(20, 10);
    cache.set('k1', 42);
    strict_1.default.equal(cache.get('k1'), 42);
    await new Promise((r) => setTimeout(r, 35));
    strict_1.default.equal(cache.get('k1'), undefined);
});
(0, node_test_1.test)('TTLCache supports custom per-item TTL override and bounded eviction', () => {
    const cache = new cpuOptimization_1.TTLCache(5000, 3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // evicts oldest ('a')
    strict_1.default.equal(cache.get('a'), undefined);
    strict_1.default.equal(cache.get('b'), 2);
    strict_1.default.equal(cache.get('d'), 4);
});
(0, node_test_1.test)('TTLCache invalidatePrefix removes matching keys without touching others', () => {
    const cache = new cpuOptimization_1.TTLCache(5000, 20);
    cache.set('courses:u1', 'list1');
    cache.set('courses:u2', 'list2');
    cache.set('slides:l1', 'slides');
    cache.invalidatePrefix('courses:u1');
    strict_1.default.equal(cache.get('courses:u1'), undefined);
    strict_1.default.equal(cache.get('courses:u2'), 'list2');
    strict_1.default.equal(cache.get('slides:l1'), 'slides');
});
(0, node_test_1.test)('classifyBotUserAgent flags malicious scanners', () => {
    for (const ua of ['sqlmap/1.7', 'Mozilla/5.0 Nikto/2.1', 'Nuclei - Open-source', 'masscan/1.3', 'zgrab/0.x', 'gobuster/3.1', 'DirBuster-1.0']) {
        strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)(ua, '/api/courses'), 'malicious', `Expected malicious for ${ua}`);
    }
});
(0, node_test_1.test)('classifyBotUserAgent flags automated crawlers and empty UA on /api/*', () => {
    for (const ua of [
        'python-requests/2.31.0',
        'Scrapy/2.11',
        'curl/8.4.0',
        'Wget/1.21',
        'HeadlessChrome/120.0.0.0',
        'GPTBot/1.0',
        'CCBot/2.0',
        'Bytespider',
        'ClaudeBot/1.0',
        'SemrushBot/7',
        'AhrefsBot/7.0',
        'MJ12bot/v1.4.8',
        'PetalBot',
        '',
    ]) {
        strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)(ua, '/api/past-papers'), 'crawler', `Expected crawler for ${ua}`);
    }
});
(0, node_test_1.test)('classifyBotUserAgent allows legitimate browsers and webhook/health endpoints', () => {
    strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0', '/api/courses'), 'legitimate');
    strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)('', '/ping'), 'legitimate');
    strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)('', '/api/health'), 'legitimate');
    strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)('Paystack/1.0', '/api/webhooks/paystack'), 'legitimate');
    strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)('curl/8.4.0', '/api/cron/reset-quotas'), 'legitimate');
    strict_1.default.equal((0, cpuOptimization_1.classifyBotUserAgent)('', '/dashboard'), 'legitimate');
});
(0, node_test_1.test)('ExpensiveEndpointProtector enforces concurrency caps and idempotent release', () => {
    const protector = new cpuOptimization_1.ExpensiveEndpointProtector({
        maxRequests: 10,
        windowMs: 60_000,
        maxConcurrent: 2,
    });
    const g1 = protector.acquire('user-1');
    const g2 = protector.acquire('user-1');
    strict_1.default.equal(g1.allowed, true);
    strict_1.default.equal(g2.allowed, true);
    const g3 = protector.acquire('user-1');
    strict_1.default.equal(g3.allowed, false);
    strict_1.default.equal(g3.reason, 'concurrency_limit');
    strict_1.default.ok(g3.retryAfterSec >= 1);
    // Different key stays independent
    const other = protector.acquire('user-2');
    strict_1.default.equal(other.allowed, true);
    other.release();
    // Releasing once restores slot; calling release twice is idempotent and does not over-decrement
    g1.release();
    g1.release();
    const g4 = protector.acquire('user-1');
    strict_1.default.equal(g4.allowed, true);
    g2.release();
    g4.release();
});
(0, node_test_1.test)('ExpensiveEndpointProtector enforces sliding-window rate limits per key', () => {
    const protector = new cpuOptimization_1.ExpensiveEndpointProtector({
        maxRequests: 2,
        windowMs: 60_000,
        maxConcurrent: 5,
    });
    const first = protector.acquire('ip-1');
    strict_1.default.equal(first.allowed, true);
    first.release();
    const second = protector.acquire('ip-1');
    strict_1.default.equal(second.allowed, true);
    second.release();
    const third = protector.acquire('ip-1');
    strict_1.default.equal(third.allowed, false);
    strict_1.default.equal(third.reason, 'rate_limit');
    strict_1.default.ok(third.retryAfterSec >= 1);
});
(0, node_test_1.test)('InFlightDeduplicator coalesces concurrent calls and removes key on settlement', async () => {
    const dedup = new cpuOptimization_1.InFlightDeduplicator();
    let executions = 0;
    const task = async () => {
        executions += 1;
        await new Promise((r) => setTimeout(r, 20));
        return { value: executions };
    };
    const [a, b, c] = await Promise.all([
        dedup.run('same-key', task),
        dedup.run('same-key', task),
        dedup.run('same-key', task),
    ]);
    strict_1.default.equal(executions, 1);
    strict_1.default.equal(a.value, 1);
    strict_1.default.equal(b.value, 1);
    strict_1.default.equal(c.value, 1);
    // Subsequent call after settlement executes fresh
    const d = await dedup.run('same-key', task);
    strict_1.default.equal(executions, 2);
    strict_1.default.equal(d.value, 2);
});
(0, node_test_1.test)('InFlightDeduplicator clears key on rejection so retries run cleanly', async () => {
    const dedup = new cpuOptimization_1.InFlightDeduplicator();
    let attempts = 0;
    await strict_1.default.rejects(Promise.all([
        dedup.run('k', async () => {
            attempts += 1;
            await new Promise((r) => setTimeout(r, 10));
            throw new Error('boom');
        }),
        dedup.run('k', async () => {
            attempts += 1;
            return 'ok';
        }),
    ]), /boom/);
    strict_1.default.equal(attempts, 1);
    const retry = await dedup.run('k', async () => {
        attempts += 1;
        return 'ok';
    });
    strict_1.default.equal(retry, 'ok');
    strict_1.default.equal(attempts, 2);
});
(0, node_test_1.test)('PerformanceTelemetryCollector aggregates frequency, slowest endpoints, RPM, CPU, and DB duration', () => {
    const collector = new cpuOptimization_1.PerformanceTelemetryCollector();
    collector.recordRequest({ route: '/api/courses', method: 'GET', durationMs: 40, cpuTimeMs: 5, statusCode: 200 });
    collector.recordRequest({ route: '/api/courses', method: 'GET', durationMs: 60, cpuTimeMs: 7, statusCode: 200 });
    collector.recordRequest({ route: '/api/courses', method: 'GET', durationMs: 50, cpuTimeMs: 6, statusCode: 200 });
    collector.recordRequest({ route: '/api/ai/solve-graph', method: 'POST', durationMs: 1200, cpuTimeMs: 140, statusCode: 500 });
    collector.recordDbQuery({ target: 'rest/v1/slides', durationMs: 320, status: 200 });
    collector.recordDbQuery({ target: 'rest/v1/courses', durationMs: 80, status: 200 });
    const snap = collector.getSnapshot();
    strict_1.default.equal(snap.totalRequests, 4);
    strict_1.default.equal(snap.requestsPerMinute, 4);
    strict_1.default.equal(snap.mostFrequentRoutes[0].route, 'GET /api/courses');
    strict_1.default.equal(snap.mostFrequentRoutes[0].count, 3);
    strict_1.default.equal(snap.mostFrequentRoutes[0].avgDurationMs, 50);
    strict_1.default.equal(snap.slowestEndpoints[0].route, 'POST /api/ai/solve-graph');
    strict_1.default.equal(snap.slowestEndpoints[0].avgDurationMs, 1200);
    strict_1.default.equal(snap.slowestEndpoints[0].errorCount, 1);
    strict_1.default.equal(snap.cpuByRoute[0].route, 'POST /api/ai/solve-graph');
    strict_1.default.equal(snap.cpuByRoute[0].totalCpuMs, 140);
    strict_1.default.equal(snap.database.totalQueries, 2);
    strict_1.default.equal(snap.database.avgDurationMs, 200);
    strict_1.default.equal(snap.database.maxDurationMs, 320);
    strict_1.default.equal(snap.database.slowQueryCount, 1);
    strict_1.default.equal(snap.database.byTarget[0].target, 'rest/v1/slides');
});
