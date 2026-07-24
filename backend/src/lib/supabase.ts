import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Service role client — bypasses RLS
// Use ONLY for webhooks, cron jobs, admin routes, or platform balance
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// User-scoped client — respects RLS
// Use for ALL user requests
export function supabaseAsUser(userJwt?: string) {
  if (userJwt) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${userJwt}` }
      }
    });
  }
  // No JWT, use anonymous client without auth header
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

