import { createClient } from '@/lib/supabase/server';

export async function getOptimalKey(provider: string): Promise<string | null> {
  const supabase = await createClient(); // Will use service role internally if configured, or just normal client. Wait, we need service role to bypass RLS.
  
  // Actually, we should use the service role client since the backend needs to read the keys regardless of the user.
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: keys, error } = await adminSupabase
    .from('ai_api_keys')
    .select('*')
    .eq('provider', provider)
    .eq('status', 'active')
    .order('last_used_at', { ascending: true })
    .limit(1);

  if (error || !keys || keys.length === 0) {
    // Fallback to env variables if no active keys in DB
    return getEnvKey(provider);
  }

  const selectedKey = keys[0];

  // Update last_used_at
  await adminSupabase
    .from('ai_api_keys')
    .update({ 
      last_used_at: new Date().toISOString(),
      usage_count: (selectedKey.usage_count || 0) + 1
    })
    .eq('id', selectedKey.id);

  return selectedKey.key_value;
}

export async function reportKeyFailure(provider: string, keyValue: string, statusCode: number) {
  if (statusCode !== 429 && statusCode !== 402 && statusCode !== 401) return;

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Set status to rate_limited or exhausted
  const status = statusCode === 401 ? 'exhausted' : 'rate_limited';

  await adminSupabase
    .from('ai_api_keys')
    .update({ status })
    .eq('provider', provider)
    .eq('key_value', keyValue);
}

export async function reportTokenUsage(provider: string, keyValue: string, tokensUsed: number) {
  if (!tokensUsed || tokensUsed <= 0) return;

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // We fetch the current tokens and add to it. 
  // In a high-concurrency app, this would be an RPC function to avoid race conditions, but this is fine for now.
  const { data } = await adminSupabase
    .from('ai_api_keys')
    .select('total_tokens_used')
    .eq('provider', provider)
    .eq('key_value', keyValue)
    .single();

  if (data) {
    await adminSupabase
      .from('ai_api_keys')
      .update({ total_tokens_used: (data.total_tokens_used || 0) + tokensUsed })
      .eq('provider', provider)
      .eq('key_value', keyValue);
  }
}

function getEnvKey(provider: string): string | null {
  switch (provider.toLowerCase()) {
    case 'gemini': return process.env.GEMINI_API_KEY || null;
    case 'grok': return process.env.GROQ_API_KEY || null; // GROQ mapping
    case 'openai': return process.env.OPENROUTER_API_KEY || null; // Fallback mapping
    default: return null;
  }
}

export async function executeWithRotation<T>(
  provider: string, 
  executeFn: (apiKey: string) => Promise<{ result: T; tokens: number }>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    const key = await getOptimalKey(provider);
    if (!key) {
      throw new Error(`No active keys available for provider: ${provider}`);
    }

    try {
      const { result, tokens } = await executeFn(key);
      if (tokens > 0) {
        // Fire and forget reporting to avoid slowing down response
        reportTokenUsage(provider, key, tokens).catch(e => console.error("Token reporting failed:", e));
      }
      return result;
    } catch (err: any) {
      lastError = err;
      const status = err.status || err.response?.status || 500;
      
      // If it's a rate limit or auth error, flag the key and try again
      if (status === 429 || status === 402 || status === 401) {
        await reportKeyFailure(provider, key, status);
        continue;
      }
      
      // If it's a normal error (like bad request), throw immediately
      throw err;
    }
  }

  throw new Error(`All active keys for ${provider} failed. Last error: ${lastError?.message}`);
}
