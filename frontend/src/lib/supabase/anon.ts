import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const NO_PERSIST_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Shared stateless anon client for public server routes to reuse HTTP/connection pools
 * without spawning per-request session timers.
 */
export function getPublicSupabaseClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: NO_PERSIST_AUTH }
    );
  }
  return publicClient;
}

/**
 * Shared stateless service-role client for server routes that intentionally bypass RLS.
 */
export function getAdminSupabaseClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: NO_PERSIST_AUTH }
    );
  }
  return adminClient;
}
