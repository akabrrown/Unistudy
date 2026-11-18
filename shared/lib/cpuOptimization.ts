export type BotClassification = 'malicious' | 'crawler' | 'legitimate';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Bounded in-memory TTL cache without background timers so serverless/idle instances stay asleep.
 */
export class TTLCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly defaultTtlMs: number,
    private readonly maxEntries = 500
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    if (ttl <= 0) return;

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      this.pruneExpiredOrOldest();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  private pruneExpiredOrOldest(): void {
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
export function classifyBotUserAgent(
  userAgent: string | null | undefined,
  path: string
): BotClassification {
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

export interface ExpensiveProtectorOptions {
  maxRequests: number;
  windowMs: number;
  maxConcurrent: number;
  maxKeys?: number;
}

export interface ExpensiveAcquireResult {
  allowed: boolean;
  reason?: 'rate_limit' | 'concurrency_limit';
  retryAfterSec: number;
  release: () => void;
}

interface ProtectorBucket {
  timestamps: number[];
  activeCount: number;
}

const NOOP_RELEASE = () => {};

/**
 * Protects expensive endpoints (AI generation, OCR, translation, Moodle sync)
 * using both per-key sliding-window rate limits and active concurrency caps.
 */
export class ExpensiveEndpointProtector {
  private readonly buckets = new Map<string, ProtectorBucket>();
  private readonly maxKeys: number;

  constructor(private readonly options: ExpensiveProtectorOptions) {
    this.maxKeys = options.maxKeys ?? 1000;
  }

  acquire(key: string): ExpensiveAcquireResult {
    const now = Date.now();
    const cutoff = now - this.options.windowMs;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      if (this.buckets.size >= this.maxKeys) {
        this.pruneStaleBuckets(cutoff);
      }
      bucket = { timestamps: [], activeCount: 0 };
      this.buckets.set(key, bucket);
    } else {
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
        if (released) return;
        released = true;
        if (bucket && bucket.activeCount > 0) {
          bucket.activeCount -= 1;
        }
      },
    };
  }

  private pruneStaleBuckets(cutoff: number): void {
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

/**
 * Coalesces simultaneous identical async work into a single execution.
 */
export class InFlightDeduplicator<K = string, T = unknown> {
  private readonly inflight = new Map<K, Promise<T>>();

  run(key: K, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) {
      return existing;
    }

    const promise: Promise<T> = Promise.resolve()
      .then(() => fn())
      .finally(() => {
        if (this.inflight.get(key) === promise) {
          this.inflight.delete(key);
        }
      });

    this.inflight.set(key, promise);
    return promise;
  }

  get activeCount(): number {
    return this.inflight.size;
  }
}

export interface RequestMetricInput {
  route: string;
  method: string;
  durationMs: number;
  cpuTimeMs?: number;
  statusCode: number;
}

export interface DbQueryMetricInput {
  target: string;
  durationMs: number;
  status?: number;
}

interface RouteAccumulator {
  route: string;
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
  totalCpuMs: number;
  errorCount: number;
}

interface DbTargetAccumulator {
  target: string;
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
  slowCount: number;
}

export interface RouteTelemetrySummary {
  route: string;
  count: number;
  avgDurationMs: number;
  maxDurationMs: number;
  totalCpuMs: number;
  avgCpuMs: number;
  errorCount: number;
}

export interface TelemetrySnapshot {
  totalRequests: number;
  requestsPerMinute: number;
  mostFrequentRoutes: RouteTelemetrySummary[];
  slowestEndpoints: RouteTelemetrySummary[];
  cpuByRoute: RouteTelemetrySummary[];
  database: {
    totalQueries: number;
    avgDurationMs: number;
    maxDurationMs: number;
    slowQueryCount: number;
    byTarget: Array<{
      target: string;
      count: number;
      avgDurationMs: number;
      maxDurationMs: number;
      slowCount: number;
    }>;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Bounded in-process telemetry collector for API frequency, latency, CPU consumption,
 * requests per minute, and database query duration.
 */
export class PerformanceTelemetryCollector {
  private totalRequests = 0;
  private recentRequestTimestamps: number[] = [];
  private readonly routeStats = new Map<string, RouteAccumulator>();
  private readonly dbTargets = new Map<string, DbTargetAccumulator>();
  private totalDbQueries = 0;
  private totalDbDurationMs = 0;
  private maxDbDurationMs = 0;
  private slowDbQueryCount = 0;

  constructor(
    private readonly slowQueryThresholdMs = 250,
    private readonly maxTrackedRoutes = 200,
    private readonly maxTrackedDbTargets = 100
  ) {}

  recordRequest(input: RequestMetricInput): void {
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
    if (durationMs > acc.maxDurationMs) acc.maxDurationMs = durationMs;
    acc.totalCpuMs += cpuMs;
    if (isError) acc.errorCount += 1;
  }

  recordDbQuery(input: DbQueryMetricInput): void {
    const durationMs = Math.max(0, input.durationMs);
    const isSlow = durationMs >= this.slowQueryThresholdMs;

    this.totalDbQueries += 1;
    this.totalDbDurationMs += durationMs;
    if (durationMs > this.maxDbDurationMs) this.maxDbDurationMs = durationMs;
    if (isSlow) this.slowDbQueryCount += 1;

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
    if (durationMs > acc.maxDurationMs) acc.maxDurationMs = durationMs;
    if (isSlow) acc.slowCount += 1;
  }

  getSnapshot(): TelemetrySnapshot {
    const cutoff = Date.now() - 60_000;
    this.recentRequestTimestamps = this.recentRequestTimestamps.filter((t) => t > cutoff);

    const summaries: RouteTelemetrySummary[] = [...this.routeStats.values()].map((r) => ({
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

export const globalTelemetry = new PerformanceTelemetryCollector();
