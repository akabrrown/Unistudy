// backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase client for server-side usage.
 * Uses the service role key for privileged operations.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
