import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TTLCache,
  classifyBotUserAgent,
  ExpensiveEndpointProtector,
  InFlightDeduplicator,
  PerformanceTelemetryCollector,
} from './cpuOptimization';

test('TTLCache stores and retrieves values within TTL', () => {
  const cache = new TTLCache<string>(1000, 10);
  cache.set('k1', 'v1');
  assert.equal(cache.get('k1'), 'v1');
  assert.equal(cache.get('missing'), undefined);
});

test('TTLCache expires entries after TTL elapses', async () => {
  const cache = new TTLCache<number>(20, 10);
  cache.set('k1', 42);
  assert.equal(cache.get('k1'), 42);
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(cache.get('k1'), undefined);
});

test('TTLCache supports custom per-item TTL override and bounded eviction', () => {
  const cache = new TTLCache<number>(5000, 3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.set('d', 4); // evicts oldest ('a')
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('d'), 4);
});

test('TTLCache invalidatePrefix removes matching keys without touching others', () => {
  const cache = new TTLCache<string>(5000, 20);
  cache.set('courses:u1', 'list1');
  cache.set('courses:u2', 'list2');
  cache.set('slides:l1', 'slides');
  cache.invalidatePrefix('courses:u1');
  assert.equal(cache.get('courses:u1'), undefined);
  assert.equal(cache.get('courses:u2'), 'list2');
  assert.equal(cache.get('slides:l1'), 'slides');
});

test('classifyBotUserAgent flags malicious scanners', () => {
  for (const ua of ['sqlmap/1.7', 'Mozilla/5.0 Nikto/2.1', 'Nuclei - Open-source', 'masscan/1.3', 'zgrab/0.x', 'gobuster/3.1', 'DirBuster-1.0']) {
    assert.equal(classifyBotUserAgent(ua, '/api/courses'), 'malicious', `Expected malicious for ${ua}`);
  }
});

test('classifyBotUserAgent flags automated crawlers and empty UA on /api/*', () => {
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
    assert.equal(classifyBotUserAgent(ua, '/api/past-papers'), 'crawler', `Expected crawler for ${ua}`);
  }
});

test('classifyBotUserAgent allows legitimate browsers and webhook/health endpoints', () => {
  assert.equal(classifyBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0', '/api/courses'), 'legitimate');
  assert.equal(classifyBotUserAgent('', '/ping'), 'legitimate');
  assert.equal(classifyBotUserAgent('', '/api/health'), 'legitimate');
  assert.equal(classifyBotUserAgent('Paystack/1.0', '/api/webhooks/paystack'), 'legitimate');
  assert.equal(classifyBotUserAgent('curl/8.4.0', '/api/cron/reset-quotas'), 'legitimate');
  assert.equal(classifyBotUserAgent('', '/dashboard'), 'legitimate');
});

test('ExpensiveEndpointProtector enforces concurrency caps and idempotent release', () => {
  const protector = new ExpensiveEndpointProtector({
    maxRequests: 10,
    windowMs: 60_000,
    maxConcurrent: 2,
  });

  const g1 = protector.acquire('user-1');
  const g2 = protector.acquire('user-1');
  assert.equal(g1.allowed, true);
  assert.equal(g2.allowed, true);

  const g3 = protector.acquire('user-1');
  assert.equal(g3.allowed, false);
  assert.equal(g3.reason, 'concurrency_limit');
  assert.ok(g3.retryAfterSec >= 1);

  // Different key stays independent
  const other = protector.acquire('user-2');
  assert.equal(other.allowed, true);
  other.release();

  // Releasing once restores slot; calling release twice is idempotent and does not over-decrement
  g1.release();
  g1.release();
  const g4 = protector.acquire('user-1');
  assert.equal(g4.allowed, true);
  g2.release();
  g4.release();
});

test('ExpensiveEndpointProtector enforces sliding-window rate limits per key', () => {
  const protector = new ExpensiveEndpointProtector({
    maxRequests: 2,
    windowMs: 60_000,
    maxConcurrent: 5,
  });

  const first = protector.acquire('ip-1');
  assert.equal(first.allowed, true);
  first.release();

  const second = protector.acquire('ip-1');
  assert.equal(second.allowed, true);
  second.release();

  const third = protector.acquire('ip-1');
  assert.equal(third.allowed, false);
  assert.equal(third.reason, 'rate_limit');
  assert.ok(third.retryAfterSec >= 1);
});

test('InFlightDeduplicator coalesces concurrent calls and removes key on settlement', async () => {
  const dedup = new InFlightDeduplicator<string, { value: number }>();
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

  assert.equal(executions, 1);
  assert.equal(a.value, 1);
  assert.equal(b.value, 1);
  assert.equal(c.value, 1);

  // Subsequent call after settlement executes fresh
  const d = await dedup.run('same-key', task);
  assert.equal(executions, 2);
  assert.equal(d.value, 2);
});

test('InFlightDeduplicator clears key on rejection so retries run cleanly', async () => {
  const dedup = new InFlightDeduplicator<string, string>();
  let attempts = 0;

  await assert.rejects(
    Promise.all([
      dedup.run('k', async () => {
        attempts += 1;
        await new Promise((r) => setTimeout(r, 10));
        throw new Error('boom');
      }),
      dedup.run('k', async () => {
        attempts += 1;
        return 'ok';
      }),
    ]),
    /boom/
  );
  assert.equal(attempts, 1);

  const retry = await dedup.run('k', async () => {
    attempts += 1;
    return 'ok';
  });
  assert.equal(retry, 'ok');
  assert.equal(attempts, 2);
});

test('PerformanceTelemetryCollector aggregates frequency, slowest endpoints, RPM, CPU, and DB duration', () => {
  const collector = new PerformanceTelemetryCollector();

  collector.recordRequest({ route: '/api/courses', method: 'GET', durationMs: 40, cpuTimeMs: 5, statusCode: 200 });
  collector.recordRequest({ route: '/api/courses', method: 'GET', durationMs: 60, cpuTimeMs: 7, statusCode: 200 });
  collector.recordRequest({ route: '/api/courses', method: 'GET', durationMs: 50, cpuTimeMs: 6, statusCode: 200 });
  collector.recordRequest({ route: '/api/ai/solve-graph', method: 'POST', durationMs: 1200, cpuTimeMs: 140, statusCode: 500 });

  collector.recordDbQuery({ target: 'rest/v1/slides', durationMs: 320, status: 200 });
  collector.recordDbQuery({ target: 'rest/v1/courses', durationMs: 80, status: 200 });

  const snap = collector.getSnapshot();
  assert.equal(snap.totalRequests, 4);
  assert.equal(snap.requestsPerMinute, 4);

  assert.equal(snap.mostFrequentRoutes[0].route, 'GET /api/courses');
  assert.equal(snap.mostFrequentRoutes[0].count, 3);
  assert.equal(snap.mostFrequentRoutes[0].avgDurationMs, 50);

  assert.equal(snap.slowestEndpoints[0].route, 'POST /api/ai/solve-graph');
  assert.equal(snap.slowestEndpoints[0].avgDurationMs, 1200);
  assert.equal(snap.slowestEndpoints[0].errorCount, 1);

  assert.equal(snap.cpuByRoute[0].route, 'POST /api/ai/solve-graph');
  assert.equal(snap.cpuByRoute[0].totalCpuMs, 140);

  assert.equal(snap.database.totalQueries, 2);
  assert.equal(snap.database.avgDurationMs, 200);
  assert.equal(snap.database.maxDurationMs, 320);
  assert.equal(snap.database.slowQueryCount, 1);
  assert.equal(snap.database.byTarget[0].target, 'rest/v1/slides');
});
