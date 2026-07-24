import { Redis } from '@upstash/redis'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { ProviderName, PROVIDER_CONFIG } from '../../../../shared/constants/quota'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unistudy.ai';

export async function getProviderStatus(provider: ProviderName) {
  if (redis) {
    const cached = await redis.get(`platform:balance:${provider}`);
    if (cached) return cached as any;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('platform_ai_balance')
    .select('*')
    .eq('provider', provider)
    .single();

  if (error || !data) {
    console.error(`Error fetching balance for ${provider}:`, error);
    return null;
  }

  let total = 0
  let consumed = 0
  let remaining = 0

  if (data.pool_type === 'funded') {
    total = data.total_purchased
    consumed = data.total_consumed
    remaining = data.remaining_funded
  } else if (data.pool_type === 'free_daily') {
    total = data.daily_limit
    consumed = data.daily_consumed
    remaining = Math.max(0, total - consumed)
  } else if (data.pool_type === 'free_monthly') {
    total = data.monthly_limit
    consumed = data.monthly_consumed
    remaining = Math.max(0, total - consumed)
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
    should_restrict_free: pct_used >= data.auto_restrict_free_pct,
    should_disable: pct_used >= data.auto_disable_pct
  };

  if (redis) {
    try {
      await redis.set(`platform:balance:${provider}`, result, { ex: 60 });
    } catch (e) {
      console.warn("Redis write failed (possibly NOPERM read-only token):", e);
    }
  }

  return result;
}

export async function deductFromPool(provider: ProviderName, amount: number) {
  const config = PROVIDER_CONFIG[provider]
  if (config.pool_type === 'free_rate_limit') return true // no explicit numeric pool deduction

  const supabase = await createClient();
  let rpcName = ''
  
  if (config.pool_type === 'credit_funded') rpcName = 'deduct_funded_pool'
  else if (config.pool_type === 'free_daily') rpcName = 'deduct_daily_pool'

  const { data, error } = await supabase.rpc(rpcName, {
    p_provider: provider,
    p_amount: amount
  });

  if (error || data === false) {
    console.error(`Failed to deduct from ${provider} pool`, error);
    return false;
  }

  if (redis) {
    try {
      await redis.del(`platform:balance:${provider}`);
    } catch (e) {
      console.warn("Redis delete failed:", e);
    }
  }

  return true;
}

export async function checkAndAlert(provider: ProviderName) {
  const status = await getProviderStatus(provider);
  if (!status) return;

  const supabase = await createClient();

  const hasUnresolvedAlert = async (alertType: string) => {
    const { data } = await supabase
      .from('platform_alerts')
      .select('id')
      .eq('alert_type', alertType)
      .eq('provider', provider)
      .eq('resolved', false)
      .limit(1);
    return data && data.length > 0;
  };

  const createAlert = async (type: string, subject: string, message: string) => {
    await supabase.from('platform_alerts').insert({
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

  // Check Disable
  if (status.should_disable && !status.is_disabled) {
    if (!(await hasUnresolvedAlert('auto_disable'))) {
      await createAlert('auto_disable', `[CRITICAL] ${provider} DISABLED`, `Provider ${provider} hit disable threshold. Shutting down pool.`);
      await supabase.from('platform_ai_balance').update({ is_disabled: true }).eq('provider', provider);
    }
  } 
  // Check Restrict Free
  else if (status.should_restrict_free && !status.is_free_restricted) {
    if (!(await hasUnresolvedAlert('restrict_free'))) {
      await createAlert('restrict_free', `[URGENT] ${provider} Free Restricted`, `Provider ${provider} hit restrict free threshold.`);
      await supabase.from('platform_ai_balance').update({ is_free_restricted: true }).eq('provider', provider);
    }
  }
  // Check Urgent
  else if (status.should_urgent) {
    if (!(await hasUnresolvedAlert('urgent'))) {
      await createAlert('urgent', `[URGENT] ${provider} pool very low`, `Provider ${provider} is at ${status.pct_used}% used.`);
    }
  }
  // Check Warn
  else if (status.should_warn) {
    if (!(await hasUnresolvedAlert('warn'))) {
      await createAlert('warn', `[WARNING] ${provider} pool low`, `Provider ${provider} is at ${status.pct_used}% used.`);
    }
  }
}

export async function getAllProviderStatuses() {
  const supabase = await createClient()
  const { data } = await supabase.from('platform_ai_balance').select('*').order('provider')
  return data || []
}
