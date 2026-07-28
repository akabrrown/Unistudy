import os
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Any, Dict, List
from pydantic import BaseModel

import requests
from supabase import create_client, Client
from postgrest.exceptions import APIError
from dotenv import load_dotenv

# Load .env file from converter/ directory (for local dev without Docker)
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

# Initialize Supabase client – expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials not set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# Provider routing (Layer One)
# ---------------------------------------------------------------------------
TASK_PROVIDER_MAP = {
    "vision": "gemini",
    "streaming": "groq70b",
    "generation": "gemini",
    "search": "huggingface",
    "low_priority": "cloudflare_workers",
    "overflow": "mistral",
    "rerank": "cohere",
}

def route_task_to_provider(task_type: str) -> str:
    """Return the provider name for a given logical task type.

    Args:
        task_type: One of the keys defined in TASK_PROVIDER_MAP.
    """
    provider = TASK_PROVIDER_MAP.get(task_type)
    if not provider:
        raise ValueError(f"Unknown task type: {task_type}")
    return provider

# ---------------------------------------------------------------------------
# Cache handling (Layer Three)
# ---------------------------------------------------------------------------
def _hash_payload(payload: Any) -> str:
    """Create a deterministic SHA‑256 hash for any JSON‑serialisable payload."""
    payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload_bytes).hexdigest()

def get_cached_result(hash_key: str) -> Optional[Dict[str, Any]]:
    """Return a cached AI response if it exists, otherwise None."""
    try:
        res = supabase.table("ai_cache").select("response").eq("hash", hash_key).limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0].get("response")
    except APIError as e:
        if "PGRST116" in str(e):
            return None
        raise
    return None

def store_cache(hash_key: str, response: Any, provider: str, ttl_days: int = 30) -> None:
    """Store a fresh AI response for later reuse.

    Args:
        hash_key: SHA‑256 hash of the request payload.
        response: The JSON‑serialisable response to cache.
        provider: The AI provider that generated the response.
        ttl_days: Number of days after which the cache entry expires.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=ttl_days)
    supabase.table("ai_cache").upsert({
        "hash": hash_key,
        "response": response,
        "provider": provider,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    }).execute()

# ---------------------------------------------------------------------------
# Quota handling (Layer Two)
# ---------------------------------------------------------------------------
def _period_start(period_type: str) -> datetime:
    """Return the start datetime for the given period type.

    * ``day`` – midnight (Ghana time) of the current day.
    * ``month`` – first day of the current month.
    """
    now = datetime.now(timezone.utc)
    if period_type == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period_type == "month":
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    raise ValueError(f"Invalid period_type: {period_type}")

def check_quota(user_id: str, category: str) -> bool:
    """Return True if the user is under their quota for the given category.

    Limits are derived from the user's plan (free, pro, enterprise).
    """
    period_type = "day" if category in {"vision", "streaming", "low_priority"} else "month"
    period_start = _period_start(period_type)

    # Fetch current counter
    try:
        resp = (
            supabase.table("ai_quota_counters")
            .select("count")
            .eq("user_id", user_id)
            .eq("category", category)
            .eq("period_type", period_type)
            .limit(1)
            .execute()
        )
        current_count = resp.data[0]["count"] if (resp.data and len(resp.data) > 0) else 0
    except APIError as e:
        if "PGRST116" in str(e):
            current_count = 0
        else:
            raise

    # Get user's subscription plan
    try:
        user_resp = supabase.table("profiles").select("plan").eq("id", user_id).limit(1).execute()
        plan = user_resp.data[0].get("plan", "free") if (user_resp.data and len(user_resp.data) > 0) else "free"
    except APIError as e:
        if "PGRST116" in str(e):
            plan = "free"
        else:
            raise

    limits = {
        "free": {"vision": 30, "streaming": 20, "generation": 3, "search": None, "low_priority": None, "rerank": 1000},
        "pro": {"vision": 150, "streaming": 100, "generation": 20, "search": None, "low_priority": None, "rerank": None},
        "ultra": {"vision": 500, "streaming": 500, "generation": 100, "search": None, "low_priority": None, "rerank": None},
        "enterprise": {"vision": None, "streaming": None, "generation": None, "search": None, "low_priority": None, "rerank": None},
    }
    limit = limits[plan].get(category)
    if limit is None:
        return True
    return current_count < limit

def increment_quota(user_id: str, category: str) -> None:
    """Increment the usage counter for the given user/category."""
    period_type = "day" if category in {"vision", "streaming", "low_priority"} else "month"
    period_start = _period_start(period_type)
    
    # Try fetching the current counter first
    try:
        resp = supabase.table("ai_quota_counters").select("count", "id").eq("user_id", user_id).eq("category", category).eq("period_type", period_type).limit(1).execute()
        if resp.data and len(resp.data) > 0:
            current_count = resp.data[0]["count"]
            row_id = resp.data[0]["id"]
            supabase.table("ai_quota_counters").update({"count": current_count + 1}).eq("id", row_id).execute()
        else:
            supabase.table("ai_quota_counters").insert({
                "user_id": user_id,
                "category": category,
                "period_type": period_type,
                "period_start": period_start.isoformat(),
                "count": 1
            }).execute()
    except APIError:
        pass

# ---------------------------------------------------------------------------
# Logging (used by admin AI usage monitor)
# ---------------------------------------------------------------------------
def log_usage(user_id: str, provider: str, feature: str, tokens_used: int) -> None:
    """Insert a row into the ``ai_usage_logs`` table for audit/monitoring.
    If the user_id does not exist in the ``profiles`` table, the insert will fail due to a foreign key constraint.
    In that case we log a warning and continue, because usage logging is non‑critical.
    """
    try:
        supabase.table("ai_usage_logs").insert({
            "user_id": user_id,
            "provider": provider,
            "feature": feature,
            "tokens_used": tokens_used,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        print(f"[log_usage] warning: could not insert usage log for user {user_id}: {e}")

class GenerateRequest(BaseModel):
    user_id: str
    prompt: str

class RerankRequest(BaseModel):
    user_id: str
    query: str
    documents: List[str]  # plain text strings
    model: Optional[str] = "rerank-english-v2.0"
    top_n: Optional[int] = 10

# Helper to wrap a full AI call with cache & quota checks
def execute_ai_task(
    *,
    user_id: str,
    category: str,
    payload: Any,
    provider_func: callable,
    provider_name: Optional[str] = None,
) -> Any:
    """Check cache, enforce quota, execute provider, cache result, log usage.
    """
    cache_key = _hash_payload(payload)
    cached = get_cached_result(cache_key)
    if cached:
        return cached

    if not check_quota(user_id, category):
        raise PermissionError(f"Quota exceeded for category '{category}'. Upgrade plan to continue.")

    provider = provider_name or route_task_to_provider(category)
    response = provider_func(payload)

    store_cache(cache_key, response, provider)
    increment_quota(user_id, category)
    tokens = response.get("usage", {}).get("total_tokens", 0) if isinstance(response, dict) else 0
    log_usage(user_id, provider, category, tokens)
    return response


def _repair_json(raw: str) -> dict:
    """Try to parse JSON, repairing common Gemini output issues."""
    import json as _json, re

    # Straight parse first
    try:
        return _json.loads(raw)
    except _json.JSONDecodeError:
        pass

    # Gemini sometimes appends trailing garbage after the closing brace
    # Find the outermost {...} and parse just that
    brace_depth = 0
    start_idx = raw.find("{")
    if start_idx == -1:
        raise ValueError("No JSON object found in response")

    for i in range(start_idx, len(raw)):
        if raw[i] == "{":
            brace_depth += 1
        elif raw[i] == "}":
            brace_depth -= 1
            if brace_depth == 0:
                candidate = raw[start_idx : i + 1]
                try:
                    return _json.loads(candidate)
                except _json.JSONDecodeError:
                    break

    # Last resort: regex extract raw_text and explanation values
    raw_text_match = re.search(r'"raw_text"\s*:\s*"((?:[^"\\]|\\.)*)"', raw, re.DOTALL)
    explanation_match = re.search(r'"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"', raw, re.DOTALL)
    if raw_text_match and explanation_match:
        return {
            "raw_text": raw_text_match.group(1).encode().decode("unicode_escape", errors="replace"),
            "explanation": explanation_match.group(1).encode().decode("unicode_escape", errors="replace"),
        }

    raise ValueError(f"Could not repair JSON: {raw[:200]}…")


def gemini_vision(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extract slide text and explanation from a single image via Gemini 1.5 Flash.
    Handles 503 (overloaded) with exponential backoff internally.
    """
    import time, requests, json as _json
    from key_manager import execute_with_rotation

    start_time = time.time()
    base64_image = payload.get("base64_image", "")
    if not base64_image:
        raise RuntimeError("No base64_image provided in payload")

    prompt = payload.get("prompt", "Extract all text precisely from this slide. Also provide a detailed, easy-to-understand explanation of the slide's content, including descriptions of any charts or diagrams. Return the result as a JSON object with two keys: 'raw_text' and 'explanation'.")

    MAX_503_RETRIES = 3

    def _run(api_key):
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        headers = {
            "Content-Type": "application/json",
        }
        if api_key.startswith("AIza") or api_key.startswith("AQ."):
            headers["x-goog-api-key"] = api_key
        else:
            headers["Authorization"] = f"Bearer {api_key}"

        data = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": base64_image,
                        }
                    }
                ]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
            }
        }

        # Retry loop for transient 503 (server overloaded)
        last_err = None
        for attempt in range(MAX_503_RETRIES):
            try:
                res = requests.post(url, headers=headers, json=data, timeout=120)
            except requests.exceptions.RequestException as req_e:
                wait = 2 ** (attempt + 1)
                print(f"Gemini network error ({req_e}), retrying in {wait}s… (attempt {attempt + 1}/{MAX_503_RETRIES})")
                time.sleep(wait)
                last_err = RuntimeError(f"Gemini network error: {req_e}")
                last_err.status_code = 503
                continue

            if res.status_code == 503:
                wait = 2 ** (attempt + 1)  # 2s, 4s, 8s
                print(f"Gemini 503 (overloaded), retrying in {wait}s… (attempt {attempt + 1}/{MAX_503_RETRIES})")
                time.sleep(wait)
                last_err = RuntimeError(f"Gemini 503: {res.text[:200]}")
                last_err.status_code = 503
                continue

            if not res.ok:
                error = RuntimeError(f"Gemini API error: {res.text}")
                error.status_code = res.status_code
                raise error

            # Successful response — parse it
            res_json = res.json()
            text_content = res_json["candidates"][0]["content"]["parts"][0]["text"]

            try:
                result = _repair_json(text_content)
            except (ValueError, KeyError) as parse_err:
                print(f"JSON repair failed: {parse_err}")
                print(f"Raw text (first 500 chars): {text_content[:500]}")
                result = {"raw_text": "Error extracting text", "explanation": "Error extracting explanation"}

            duration = time.time() - start_time
            print(f"Vision Task: Image processed in {duration:.2f}s")

            tokens = 0
            if "usageMetadata" in res_json:
                tokens = res_json["usageMetadata"].get("totalTokenCount", 0)

            return {"response": result, "usage": {"total_tokens": tokens}}

        # All retries exhausted
        if last_err is not None:
            raise last_err
        raise RuntimeError("API request failed without returning a specific error.")

    try:
        return execute_with_rotation('gemini', _run, max_retries=20)
    except Exception as gemini_err:
        print(f"Gemini vision primary failed ({gemini_err}). Attempting fallback...")
        
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            try:
                or_url = "https://openrouter.ai/api/v1/chat/completions"
                or_headers = {
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json",
                }
                or_payload = {
                    "model": "google/gemini-flash-1.5",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                                }
                            ]
                        }
                    ]
                }
                or_res = requests.post(or_url, headers=or_headers, json=or_payload, timeout=60)
                if or_res.ok:
                    or_data = or_res.json()
                    content = or_data["choices"][0]["message"]["content"]
                    try:
                        result = _repair_json(content)
                    except Exception:
                        result = {"raw_text": content, "explanation": content}
                    print("OpenRouter vision fallback succeeded!")
                    return {"response": result, "usage": {"total_tokens": or_data.get("usage", {}).get("total_tokens", 0)}}
                else:
                    print(f"OpenRouter vision fallback returned status {or_res.status_code}: {or_res.text[:200]}")
            except Exception as or_e:
                print(f"OpenRouter vision fallback failed: {or_e}")

        return {
            "response": {
                "raw_text": "Text extraction failed.",
                "explanation": "Explanation pending."
            },
            "usage": {"total_tokens": 0}
        }


# Provider for Groq 70b (streaming)
def groq70b(payload: Dict[str, Any]) -> Dict[str, Any]:
    from key_manager import execute_with_rotation
    
    def _run(api_key):
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload["model"] = "llama-3.3-70b-versatile"
        response = requests.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
        response.raise_for_status()
        data = response.json()
        return {"response": data["choices"][0]["message"]["content"], "usage": {"total_tokens": data["usage"]["total_tokens"]}}
        
    return execute_with_rotation('grok', _run)

# Provider for Groq 8b (chat)
def groq8b(payload: Dict[str, Any]) -> Dict[str, Any]:
    from key_manager import execute_with_rotation
    
    def _run(api_key):
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload["model"] = "llama3-8b-8192"
        response = requests.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
        response.raise_for_status()
        data = response.json()
        return {"response": data["choices"][0]["message"]["content"], "usage": {"total_tokens": data["usage"]["total_tokens"]}}
        
    return execute_with_rotation('grok', _run)

# Provider for Mistral batch
def mistral_batch(payload: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("MISTRAL_API_KEY")
    url = "https://api.mistral.ai/v1/chat/completions"
    payload["model"] = "mistral-large-latest"
    response = requests.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
    response.raise_for_status()
    data = response.json()
    return {"response": data["choices"][0]["message"]["content"], "usage": {"total_tokens": data["usage"]["total_tokens"]}}

# Provider for Cloudflare Workers AI
def cloudflare_workers_ai(payload: Dict[str, Any]) -> Dict[str, Any]:
    account_id = os.getenv("CF_ACCOUNT_ID")
    api_token = os.getenv("CF_API_TOKEN")
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/meta/llama-3-8b-instruct"
    response = requests.post(url, headers={"Authorization": f"Bearer {api_token}"}, json=payload)
    response.raise_for_status()
    data = response.json()["result"]
    return {"response": data["response"], "usage": {"total_tokens": 0}}

# Provider for Cohere low
def cohere_low(payload: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("COHERE_API_KEY")
    url = "https://api.cohere.ai/v1/generate"
    response = requests.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
    response.raise_for_status()
    data = response.json()
    return {"response": data["text"], "usage": {"total_tokens": 0}}

# Provider for Cohere rerank
def cohere_rerank(payload: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("COHERE_API_KEY")
    url = "https://api.cohere.ai/v1/rerank"
    response = requests.post(url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload)
    response.raise_for_status()
    data = response.json()
    return {"response": data.get("results", []), "usage": {"total_tokens": 0}}

# Provider for HuggingFace embeddings / search (no quota limit)
def huggingface_search(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Perform a HuggingFace inference request (e.g., embeddings or similarity).
    The function is a generic wrapper; callers should shape ``payload`` according
    to the specific HuggingFace endpoint they intend to use.
    """
    api_token = os.getenv("HUGGINGFACE_API_TOKEN")
    if not api_token:
        raise RuntimeError("HUGGINGFACE_API_TOKEN not set in environment")
    # Example endpoint for embeddings – the caller provides ``model`` and ``inputs``.
    url = payload.get("url", "https://api-inference.huggingface.co/pipeline/feature-extraction")
    headers = {"Authorization": f"Bearer {api_token}"}
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    # Return raw data; usage metrics are not typically provided by HF.
    return {"response": data, "usage": {"total_tokens": 0}}

# Provider for OpenRouter low‑priority tasks (free models)
def openrouter_low_priority(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Call OpenRouter using a free model (e.g., Llama‑3‑8B).
    ``payload`` follows the OpenRouter Chat Completion schema.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set in environment")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return {"response": text, "usage": {"total_tokens": usage.get("total_tokens", 0)}}

# Provider for Mistral overflow via OpenRouter
def mistral_overflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback provider when Groq daily quota is exhausted.
    Uses Mistral 7B through OpenRouter.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set in environment")
    # Specify Mistral model in the payload.
    payload.setdefault("model", "mistralai/mistral-7b-instruct")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return {"response": text, "usage": {"total_tokens": usage.get("total_tokens", 0)}}


# End of ai_utils.py
