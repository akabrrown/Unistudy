import { createClient } from '../supabase/client';
import { useModelStore } from '../stores/modelStore';
import { TTLCache } from '../../../../shared/lib/cpuOptimization';

const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
// Normalize: strip trailing slashes and trailing '/api' so BACKEND_URL is always the origin host
export const BACKEND_URL = rawBackendUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');

export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `/api${cleanEndpoint}`;
  return `${BACKEND_URL}${path}`;
}

// Render free-tier services spin down after inactivity and take up to 60s to
// wake. We retry on network errors (not HTTP errors) up to MAX_RETRIES times
// with a short delay so callers don't need to handle this themselves.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 4000;

const TOKEN_CACHE_TTL_MS = 30_000;
const NEGATIVE_TOKEN_TTL_MS = 15_000;
const GET_CACHE_TTL_MS = 10_000;

const CACHEABLE_READ_PREFIXES = ['/courses', '/lectures/', '/settings/', '/quota/status'];
const DEDUPABLE_POST_PREFIXES = ['/ai/', '/translate'];

let cachedToken: { token: string | null; expiresAt: number } | null = null;
const getResponseCache = new TTLCache<any>(GET_CACHE_TTL_MS, 200);
const inflightRequestMap = new Map<string, Promise<any>>();

function isCacheableReadEndpoint(endpoint: string): boolean {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return CACHEABLE_READ_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isDedupablePostEndpoint(endpoint: string, options: RequestInit): boolean {
  if (typeof options.body !== 'string') return false;
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return DEDUPABLE_POST_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function hasActiveProcessing(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if ('processing' in payload && (payload as { processing?: boolean }).processing === true) {
    return true;
  }
  if (Array.isArray(payload)) {
    return payload.some((item) => hasActiveProcessing(item));
  }
  if ('lectures' in payload && Array.isArray((payload as { lectures?: unknown[] }).lectures)) {
    return hasActiveProcessing((payload as { lectures: unknown[] }).lectures);
  }
  return false;
}

async function resolveAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const supabase = createClient();
  let token: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch {
    // client session error fallback
  }

  // Fallback: If client browser session is uninitialized, query server token bridge
  if (!token && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/token');
      if (res.ok) {
        const json = await res.json();
        token = json.accessToken || null;
      } else if (res.status === 401) {
        cachedToken = { token: null, expiresAt: now + NEGATIVE_TOKEN_TTL_MS };
        return null;
      }
    } catch {
      // safe fallback
    }
  }

  cachedToken = {
    token,
    expiresAt: now + (token ? TOKEN_CACHE_TTL_MS : NEGATIVE_TOKEN_TTL_MS),
  };
  return token;
}

async function withRetry(fn: () => Promise<Response>): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      // Only retry on network-level failures (TypeError: Failed to fetch).
      // HTTP errors (4xx/5xx) come back as resolved Responses, not thrown.
      const isNetworkError = err instanceof TypeError;
      if (!isNetworkError || attempt === MAX_RETRIES - 1) throw err;
      lastError = err;
      await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

async function buildHeaders(options: RequestInit, token: string | null): Promise<Headers> {
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach the selected model tier globally to all API requests
  const selectedTier = useModelStore.getState().selectedTier;
  headers.set('x-model-tier', selectedTier);

  return headers;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    getResponseCache.clear();
  }

  const token = await resolveAccessToken();
  const url = buildApiUrl(endpoint);
  const canCache = method === 'GET' && !options.signal && isCacheableReadEndpoint(endpoint);
  const canDedup =
    !options.signal &&
    (method === 'GET' || (method === 'POST' && isDedupablePostEndpoint(endpoint, options)));
  const tokenSuffix = token ? token.slice(-16) : 'anon';
  const bodyKey = method === 'POST' && typeof options.body === 'string' ? `:${options.body}` : '';
  const cacheKey = `${method}:${url}:${tokenSuffix}${bodyKey}`;

  if (canCache) {
    const cached = getResponseCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  if (canDedup) {
    const inflight = inflightRequestMap.get(cacheKey);
    if (inflight) {
      return inflight;
    }
  }

  const execute = (async () => {
    const headers = await buildHeaders(options, token);
    const response = await withRetry(() =>
      fetch(url, { ...options, headers })
    );

    if (!response.ok) {
      if (response.status === 401) {
        cachedToken = null;
      }
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || errorData?.message || `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (canCache && !hasActiveProcessing(data)) {
      getResponseCache.set(cacheKey, data);
    }
    return data;
  })();

  if (canDedup) {
    inflightRequestMap.set(cacheKey, execute);
    try {
      return await execute;
    } finally {
      inflightRequestMap.delete(cacheKey);
    }
  }

  return execute;
}

export async function apiFetchRaw(endpoint: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    getResponseCache.clear();
  }

  const token = await resolveAccessToken();
  const headers = await buildHeaders(options, token);
  const url = buildApiUrl(endpoint);
  const response = await withRetry(() =>
    fetch(url, { ...options, headers })
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || errorData?.message || `API Error: ${response.statusText}`);
  }

  return response;
}
