"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
exports.supabaseAsUser = supabaseAsUser;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../config/env");
// Service role client — bypasses RLS
// Use ONLY for webhooks, cron jobs, admin routes, or platform balance
exports.supabaseAdmin = (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_SERVICE_ROLE_KEY);
// User-scoped client — respects RLS
// Use for ALL user requests
function supabaseAsUser(userJwt) {
    if (userJwt) {
        return (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_ANON_KEY, {
            global: {
                headers: { Authorization: `Bearer ${userJwt}` }
            }
        });
    }
    // No JWT, use anonymous client without auth header
    return (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_ANON_KEY);
}
