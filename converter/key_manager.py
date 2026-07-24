import os
import requests
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# How long before a rate-limited key becomes eligible for retry (minutes)
RATE_LIMIT_COOLDOWN_MINUTES = 15

# Cache validated ENV keys so we don't hit the network on every call
_env_key_valid_cache: dict[str, bool] = {}


def get_admin_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase credentials missing for key manager")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_env_key(provider: str) -> str:
    provider = provider.lower()
    env_map = {
        "gemini": "GEMINI_API_KEY",
        "grok": "GROQ_API_KEY",
        "cohere": "COHERE_API_KEY",
        "mistral": "MISTRAL_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }
    var = env_map.get(provider)
    return os.getenv(var) if var else None


def _validate_gemini_key(key: str) -> bool:
    """Quick health check using the list-models endpoint.

    Uses x-goog-api-key header (required for AQ. prefix keys).
    Result is cached in-process so repeated calls don't burn quota.
    """
    cached = _env_key_valid_cache.get(key)
    if cached is not None:
        return cached

    try:
        headers = {}
        if key.startswith("AIza") or key.startswith("AQ."):
            headers["x-goog-api-key"] = key
        else:
            headers["Authorization"] = f"Bearer {key}"
            
        res = requests.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            headers=headers,
            timeout=8,
        )
        valid = res.status_code == 200
    except Exception:
        valid = False

    if valid:
        _env_key_valid_cache[key] = True
    return valid


def _recover_rate_limited_keys(provider: str):
    """Re-activate keys whose rate-limit cooldown has expired."""
    try:
        supabase = get_admin_client()
        cutoff = (datetime.utcnow() - timedelta(minutes=RATE_LIMIT_COOLDOWN_MINUTES)).isoformat()
        supabase.table("ai_api_keys").update({"status": "active"}) \
            .eq("provider", provider) \
            .eq("status", "rate_limited") \
            .lt("last_used_at", cutoff) \
            .execute()
    except Exception as e:
        print(f"Rate-limit recovery check failed: {e}")


def get_optimal_key(provider: str) -> str:
    """Return the best available key for *provider*.

    Priority:
      1. Active DB keys (least-recently-used first)
      2. Rate-limited DB keys whose cooldown expired (auto-recovered)
      3. ENV fallback — only if a quick validation passes (Gemini), or unconditionally (other providers)
    """
    try:
        supabase = get_admin_client()

        # 1. Active DB keys
        response = supabase.table("ai_api_keys").select("*") \
            .eq("provider", provider) \
            .eq("status", "active") \
            .order("last_used_at", desc=False) \
            .limit(1).execute()

        if not response.data:
            # 2. Try recovering rate-limited keys
            _recover_rate_limited_keys(provider)
            response = supabase.table("ai_api_keys").select("*") \
                .eq("provider", provider) \
                .eq("status", "active") \
                .order("last_used_at", desc=False) \
                .limit(1).execute()

        if response.data:
            selected = response.data[0]
            supabase.table("ai_api_keys").update({
                "last_used_at": datetime.utcnow().isoformat(),
                "usage_count": (selected.get("usage_count") or 0) + 1,
            }).eq("id", selected["id"]).execute()
            return selected["key_value"]

        # 3. Fall back to ENV key
        env_key = get_env_key(provider)
        if env_key and provider == "gemini":
            if _validate_gemini_key(env_key):
                return env_key
            print(f"ENV key for {provider} failed validation, skipping")
            return None
        return env_key

    except Exception as e:
        print(f"Error fetching pooled key for {provider}: {e}")
        env_key = get_env_key(provider)
        if env_key and provider == "gemini":
            if _validate_gemini_key(env_key):
                return env_key
            return None
        return env_key


def report_key_failure(provider: str, key_value: str, status_code: int):
    if status_code not in [429, 402, 401, 403]:
        return

    status = "exhausted" if status_code in [401, 403] else "rate_limited"

    try:
        supabase = get_admin_client()
        supabase.table("ai_api_keys").update({
            "status": status,
            "last_used_at": datetime.utcnow().isoformat(),
        }).eq("provider", provider).eq("key_value", key_value).execute()
    except Exception as e:
        print(f"Error reporting key failure: {e}")


def report_token_usage(provider: str, key_value: str, tokens_used: int):
    if not tokens_used or tokens_used <= 0:
        return
    try:
        supabase = get_admin_client()
        response = supabase.table("ai_api_keys").select("total_tokens_used") \
            .eq("provider", provider) \
            .eq("key_value", key_value).execute()

        if response.data:
            current = response.data[0].get("total_tokens_used") or 0
            supabase.table("ai_api_keys").update({
                "total_tokens_used": current + tokens_used,
            }).eq("provider", provider).eq("key_value", key_value).execute()
    except Exception as e:
        print(f"Error reporting token usage: {e}")


def execute_with_rotation(provider: str, execute_fn, max_retries: int = 3):
    last_error = None
    tried_keys = set()

    for _ in range(max_retries):
        key = get_optimal_key(provider)
        if not key:
            break

        if key in tried_keys:
            # All distinct keys exhausted
            # If the last failure was a rate limit (429), sleep and retry instead of failing
            if last_error:
                status_code = getattr(last_error, "status_code", None)
                msg = str(last_error).lower()
                if status_code == 429 or "rate limit" in msg or "429" in msg or "quota" in msg:
                    import time
                    print(f"All keys rate-limited. Waiting 30s before retrying {key[:12]}…")
                    time.sleep(30)
                    tried_keys.clear()
                    # Also need to re-activate the key so get_optimal_key will pick it up
                    try:
                        supabase = get_admin_client()
                        supabase.table("ai_api_keys").update({"status": "active"}) \
                            .eq("provider", provider) \
                            .eq("key_value", key).execute()
                    except Exception:
                        pass
                    # We continue the loop but we just burned an attempt. 
                    # We might need more retries for large PPTs.
                    continue
            break
        tried_keys.add(key)

        try:
            result = execute_fn(key)

            tokens = 0
            if isinstance(result, dict) and "usage" in result and "total_tokens" in result["usage"]:
                tokens = result["usage"]["total_tokens"]
            if tokens > 0:
                report_token_usage(provider, key, tokens)

            return result
        except Exception as e:
            last_error = e

            status_code = getattr(e, "status_code", None)
            if not status_code and hasattr(e, "response"):
                status_code = getattr(e.response, "status_code", None)

            if not status_code:
                msg = str(e).lower()
                if "rate limit" in msg or "429" in msg:
                    status_code = 429
                elif "quota" in msg or "exhausted" in msg or "402" in msg:
                    status_code = 402
                elif "unauthorized" in msg or "401" in msg or "403" in msg or "permission denied" in msg:
                    status_code = 401 # Treat 403 as 401
                elif "503" in msg or "unavailable" in msg or "overloaded" in msg:
                    status_code = 503
                elif "connection aborted" in msg or "connection reset" in msg or "connectionerror" in msg:
                    status_code = 503 # Treat transient network errors as 503 so they retry!

            # Server overload — not the key's fault, don't penalize it
            if status_code == 503:
                raise e

            if status_code in [429, 402, 401, 403]:
                print(f"Key {key[:12]}… failed ({status_code}), rotating…")
                report_key_failure(provider, key, status_code)
                continue

            raise e

    raise RuntimeError(f"All keys failed for {provider}. Last error: {last_error}")
