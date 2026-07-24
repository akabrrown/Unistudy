"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderStatus = getProviderStatus;
exports.deductFromPool = deductFromPool;
exports.checkAndAlert = checkAndAlert;
exports.getAllProviderStatuses = getAllProviderStatuses;
const redis_1 = require("../redis");
const supabase_1 = require("../supabase");
const resend_1 = require("resend");
const quota_1 = require("../../../../shared/constants/quota");
const resend = process.env.RESEND_API_KEY ? new resend_1.Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unistudy.ai';
async function getProviderStatus(provider) {
    if (redis_1.redis) {
        const cached = await redis_1.redis.get(`platform:balance:${provider}`);
        if (cached)
            return cached;
    }
    const { data, error } = await supabase_1.supabaseAdmin
        .from('platform_ai_balance')
        .select('*')
        .eq('provider', provider)
        .single();
    if (error || !data) {
        console.error(`Error fetching balance for ${provider}:`, error);
        return null;
    }
    let total = 0;
    let consumed = 0;
    let remaining = 0;
    if (data.pool_type === 'credit_funded') {
        total = data.total_purchased;
        consumed = data.total_consumed;
        remaining = data.remaining_funded;
    }
    else if (data.pool_type === 'free_daily') {
        total = data.daily_limit;
        consumed = data.daily_consumed;
        remaining = Math.max(0, total - consumed);
    }
    const pct_used = total > 0 ? (consumed / total) * 100 : 0;
    const pct_remaining = 100 - pct_used;
    const result = {
        ...data,
        total,
        consumed,
        remaining,
        pct_used,
        pct_remaining,
        should_warn: pct_used >= data.alert_pct_warn,
        should_urgent: pct_used >= data.alert_pct_urgent,
        should_fallback: pct_used >= data.auto_fallback_pct,
        should_disable: pct_used >= data.auto_disable_pct
    };
    if (redis_1.redis) {
        try {
            await redis_1.redis.set(`platform:balance:${provider}`, result, { ex: 60 });
        }
        catch (e) {
            console.warn("Redis write failed:", e);
        }
    }
    return result;
}
async function deductFromPool(provider, amount) {
    const config = quota_1.PROVIDER_CONFIG[provider];
    if (config.pool_type === 'free_rate_limit')
        return true;
    let rpcName = '';
    if (config.pool_type === 'credit_funded')
        rpcName = 'deduct_funded_pool';
    else if (config.pool_type === 'free_daily')
        rpcName = 'deduct_daily_pool';
    const { data, error } = await supabase_1.supabaseAdmin.rpc(rpcName, {
        p_provider: provider,
        p_amount: amount
    });
    if (error || data === false) {
        console.error(`Failed to deduct from ${provider} pool`, error);
        return false;
    }
    if (redis_1.redis) {
        try {
            await redis_1.redis.del(`platform:balance:${provider}`);
        }
        catch (e) {
            console.warn("Redis delete failed:", e);
        }
    }
    return true;
}
async function checkAndAlert(provider) {
    const status = await getProviderStatus(provider);
    if (!status)
        return;
    const hasUnresolvedAlert = async (alertType) => {
        const { data } = await supabase_1.supabaseAdmin
            .from('platform_alerts')
            .select('id')
            .eq('alert_type', alertType)
            .eq('provider', provider)
            .eq('resolved', false)
            .limit(1);
        return data && data.length > 0;
    };
    const createAlert = async (type, subject, message) => {
        await supabase_1.supabaseAdmin.from('platform_alerts').insert({
            alert_type: type,
            provider,
            message
        });
        if (resend) {
            await resend.emails.send({
                from: 'UniStudy AI Alerts <alerts@unistudy.ai>',
                to: [ADMIN_EMAIL],
                subject,
                text: message
            });
        }
    };
    if (status.should_disable && !status.is_disabled) {
        if (!(await hasUnresolvedAlert('auto_disable'))) {
            await createAlert('auto_disable', `[CRITICAL] ${provider} DISABLED`, `Provider ${provider} hit disable threshold. Shutting down pool.`);
            await supabase_1.supabaseAdmin.from('platform_ai_balance').update({ is_disabled: true }).eq('provider', provider);
        }
    }
    else if (status.should_fallback && !status.is_fallback_active) {
        if (!(await hasUnresolvedAlert('restrict_free'))) {
            await createAlert('restrict_free', `[URGENT] ${provider} Fallback Activated`, `Provider ${provider} hit fallback threshold.`);
            await supabase_1.supabaseAdmin.from('platform_ai_balance').update({ is_fallback_active: true }).eq('provider', provider);
        }
    }
    else if (status.should_urgent) {
        if (!(await hasUnresolvedAlert('urgent'))) {
            await createAlert('urgent', `[URGENT] ${provider} pool very low`, `Provider ${provider} is at ${status.pct_used}% used.`);
        }
    }
    else if (status.should_warn) {
        if (!(await hasUnresolvedAlert('warn'))) {
            await createAlert('warn', `[WARNING] ${provider} pool low`, `Provider ${provider} is at ${status.pct_used}% used.`);
        }
    }
}
async function getAllProviderStatuses() {
    const { data } = await supabase_1.supabaseAdmin.from('platform_ai_balance').select('*').order('provider');
    return data || [];
}
