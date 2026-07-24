"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
// backend/src/config/supabase.ts
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
/**
 * Supabase client for server-side usage.
 * Uses the service role key for privileged operations.
 */
exports.supabase = (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_SERVICE_ROLE_KEY);
