import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rawBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://unistudy-kcri.onrender.com';
export const BACKEND_URL = rawBackendUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');

export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `/api${cleanEndpoint}`;
  return `${BACKEND_URL}${path}`;
}

// Render free-tier services spin down after inactivity and take up to 60s to wake.
// Retry on network errors with backoff
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3500;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError || err?.message?.includes('Network request failed');
      if (!isNetworkError || attempt === MAX_RETRIES - 1) {
        throw err;
      }
      lastError = err;
      await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

export type ModelTier = 'default' | 'fast' | 'smart';

async function getStoredModelTier(): Promise<string> {
  try {
    const tier = await AsyncStorage.getItem('unistudy-model-preference');
    return tier || 'default';
  } catch {
    return 'default';
  }
}

async function buildHeaders(options: RequestInit = {}): Promise<Record<string, string>> {
  let token: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch {
    // Session retrieval error fallback
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const modelTier = await getStoredModelTier();
  headers['x-model-tier'] = modelTier;

  return headers;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await buildHeaders(options);
  const url = buildApiUrl(endpoint);

  const response = await withRetry(() =>
    fetch(url, {
      ...options,
      headers,
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error || errorData?.message || `API Error: ${response.statusText} (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function apiFetchRaw(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers = await buildHeaders(options);
  const url = buildApiUrl(endpoint);

  const response = await withRetry(() =>
    fetch(url, {
      ...options,
      headers,
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error || errorData?.message || `API Error: ${response.statusText} (${response.status})`;
    throw new Error(errorMessage);
  }

  return response;
}

