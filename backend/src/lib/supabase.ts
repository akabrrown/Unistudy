import { createHash } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { TTLCache, globalTelemetry } from '../../../shared/lib/cpuOptimization';

const NO_PERSIST_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

function extractSupabaseTarget(input: RequestInfo | URL): string {
  try {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const { pathname } = new URL(rawUrl);
    if (pathname.startsWith('/rest/v1/rpc/')) {
      return `rest/v1/rpc/${pathname.slice('/rest/v1/rpc/'.length).split('/')[0]}`;
    }
    if (pathname.startsWith('/rest/v1/')) {
      return `rest/v1/${pathname.slice('/rest/v1/'.length).split('/')[0]}`;
    }
    if (pathname.startsWith('/auth/v1')) return 'auth/v1';
    if (pathname.startsWith('/storage/v1')) return 'storage/v1';
    return pathname.replace(/^\/+/, '') || 'supabase';
  } catch {
    return 'supabase';
  }
}

const timedSupabaseFetch: typeof fetch = async (input, init) => {
  const startMs = performance.now();
  let status = 0;
  try {
    const res = await globalThis.fetch(input, init);
    status = res.status;
    return res;
  } catch (err) {
    status = 500;
    throw err;
  } finally {
    const durationMs = performance.now() - startMs;
    globalTelemetry.recordDbQuery({
      target: extractSupabaseTarget(input),
      durationMs,
      status,
    });
  }
};

// Service role client — bypasses RLS
// Reused singleton with non-persistent auth to avoid per-request timers/listeners
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: NO_PERSIST_AUTH,
    global: { fetch: timedSupabaseFetch },
  }
);

const supabaseAnonSingleton: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: NO_PERSIST_AUTH,
    global: { fetch: timedSupabaseFetch },
  }
);

const userClientCache = new TTLCache<SupabaseClient>(5 * 60 * 1000, 300);

// User-scoped client — respects RLS, reused across requests for the same JWT
export function supabaseAsUser(userJwt?: string): SupabaseClient {
  if (!userJwt) {
    return supabaseAnonSingleton;
  }

  const key = createHash('sha256').update(userJwt).digest('hex');
  const existing = userClientCache.get(key);
  if (existing) {
    return existing;
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: NO_PERSIST_AUTH,
    global: {
      headers: { Authorization: `Bearer ${userJwt}` },
      fetch: timedSupabaseFetch,
    },
  });
  userClientCache.set(key, client);
  return client;
}
