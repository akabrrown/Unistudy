-- DROP Previous tables safely
DROP TABLE IF EXISTS ai_request_log CASCADE;
DROP TABLE IF EXISTS user_quota CASCADE;
DROP TABLE IF EXISTS platform_ai_balance CASCADE;

-- One row per provider — tracks all shared pools
CREATE TABLE platform_ai_balance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              TEXT NOT NULL UNIQUE,
  pool_type             TEXT NOT NULL,
  -- 'funded' (Gemini — real money) | 'free_daily' | 
  -- 'free_monthly' | 'free_rate_limit'
  
  -- For funded pools (Gemini)
  total_purchased       BIGINT DEFAULT 0,
  total_consumed        BIGINT DEFAULT 0,
  remaining_funded      BIGINT GENERATED ALWAYS AS 
                          (total_purchased - total_consumed) STORED,
  
  -- For free daily pools (Groq 70B, Groq 8B, YouTube, Cloudflare)
  daily_limit           BIGINT DEFAULT 0,
  daily_consumed        BIGINT DEFAULT 0,
  daily_reset           DATE DEFAULT CURRENT_DATE,
  
  -- For free monthly pools (Mistral, Cohere)
  monthly_limit         BIGINT DEFAULT 0,
  monthly_consumed      BIGINT DEFAULT 0,
  monthly_reset         DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  
  -- Alert and control thresholds
  alert_pct_warn        INT DEFAULT 70,
  alert_pct_urgent      INT DEFAULT 85,
  auto_restrict_free_pct INT DEFAULT 90,
  auto_disable_pct      INT DEFAULT 95,
  
  -- Status flags
  is_free_restricted    BOOLEAN DEFAULT FALSE,
  is_disabled           BOOLEAN DEFAULT FALSE,
  
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed all providers
INSERT INTO platform_ai_balance 
  (provider, pool_type, total_purchased, daily_limit, monthly_limit,
   alert_pct_warn, alert_pct_urgent, auto_restrict_free_pct, auto_disable_pct)
VALUES
  ('gemini',      'funded',           50000, 0,      0,        30, 15,  5,  3),
  ('groq_70b',    'free_daily',       0,     6000,   0,        70, 85,  90, 95),
  ('groq_8b',     'free_daily',       0,     14400,  0,        70, 85,  92, 97),
  ('mistral',     'free_monthly',     0,     0,      1000000,  70, 85,  90, 95),
  ('cohere',      'free_monthly',     0,     0,      1000,     70, 85,  92, 97),
  ('youtube',     'free_daily',       0,     10000,  0,        70, 85,  90, 95),
  ('cloudflare',  'free_daily',       0,     10000,  0,        70, 85,  92, 97);

-- Daily reset for free_daily providers
-- Called by cron at midnight UTC+0
CREATE OR REPLACE FUNCTION reset_daily_provider_pools()
RETURNS void LANGUAGE sql AS $$
  UPDATE platform_ai_balance SET
    daily_consumed     = 0,
    daily_reset        = CURRENT_DATE,
    is_free_restricted = FALSE,
    is_disabled        = FALSE,
    updated_at         = NOW()
  WHERE pool_type = 'free_daily'
    AND daily_reset < CURRENT_DATE;
$$;

-- Monthly reset for free_monthly providers
CREATE OR REPLACE FUNCTION reset_monthly_provider_pools()
RETURNS void LANGUAGE sql AS $$
  UPDATE platform_ai_balance SET
    monthly_consumed   = 0,
    monthly_reset      = DATE_TRUNC('month', CURRENT_DATE)::DATE,
    is_free_restricted = FALSE,
    is_disabled        = FALSE,
    updated_at         = NOW()
  WHERE pool_type = 'free_monthly'
    AND monthly_reset < DATE_TRUNC('month', CURRENT_DATE)::DATE;
$$;

-- Atomic deduction for daily pools
CREATE OR REPLACE FUNCTION deduct_daily_pool(
  p_provider TEXT,
  p_amount   INT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT daily_limit, daily_consumed, daily_reset, is_disabled
  INTO rec
  FROM platform_ai_balance
  WHERE provider = p_provider
  FOR UPDATE;

  -- Auto-reset if new day
  IF rec.daily_reset < CURRENT_DATE THEN
    UPDATE platform_ai_balance SET
      daily_consumed = 0, daily_reset = CURRENT_DATE,
      is_disabled = FALSE, is_free_restricted = FALSE
    WHERE provider = p_provider;
    rec.daily_consumed := 0;
  END IF;

  IF rec.is_disabled THEN RETURN FALSE; END IF;
  IF rec.daily_consumed + p_amount > rec.daily_limit THEN RETURN FALSE; END IF;

  UPDATE platform_ai_balance SET
    daily_consumed = daily_consumed + p_amount,
    updated_at = NOW()
  WHERE provider = p_provider;

  RETURN TRUE;
END;
$$;

-- Atomic deduction for monthly pools
CREATE OR REPLACE FUNCTION deduct_monthly_pool(
  p_provider TEXT,
  p_amount   INT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT monthly_limit, monthly_consumed, monthly_reset, is_disabled
  INTO rec
  FROM platform_ai_balance
  WHERE provider = p_provider
  FOR UPDATE;

  IF rec.is_disabled THEN RETURN FALSE; END IF;
  IF rec.monthly_consumed + p_amount > rec.monthly_limit THEN RETURN FALSE; END IF;

  UPDATE platform_ai_balance SET
    monthly_consumed = monthly_consumed + p_amount,
    updated_at = NOW()
  WHERE provider = p_provider;

  RETURN TRUE;
END;
$$;

-- Atomic deduction for funded pools
CREATE OR REPLACE FUNCTION deduct_funded_pool(
  p_provider TEXT,
  p_amount   INT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT total_purchased, total_consumed, is_disabled
  INTO rec
  FROM platform_ai_balance
  WHERE provider = p_provider
  FOR UPDATE;

  IF rec.is_disabled THEN RETURN FALSE; END IF;
  IF rec.total_purchased - rec.total_consumed < p_amount THEN RETURN FALSE; END IF;

  UPDATE platform_ai_balance SET
    total_consumed = total_consumed + p_amount,
    updated_at = NOW()
  WHERE provider = p_provider;

  RETURN TRUE;
END;
$$;

-- Per-user quota table (covers all providers through feature mapping)
CREATE TABLE user_quota (
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  plan             TEXT DEFAULT 'free',

  -- Gemini (vision + text)
  gemini_daily_used    INT DEFAULT 0,
  gemini_daily_limit   INT DEFAULT 50,
  gemini_daily_reset   DATE DEFAULT CURRENT_DATE,
  gemini_monthly_used  INT DEFAULT 0,
  gemini_monthly_limit INT DEFAULT 200,
  gemini_monthly_reset DATE DEFAULT DATE_TRUNC('month',CURRENT_DATE)::DATE,

  -- Groq 70B (calculator + chat)
  groq70_daily_used    INT DEFAULT 0,
  groq70_daily_limit   INT DEFAULT 10,
  groq70_daily_reset   DATE DEFAULT CURRENT_DATE,

  -- Groq 8B (daily brief + low priority)
  groq8_daily_used     INT DEFAULT 0,
  groq8_daily_limit    INT DEFAULT 20,
  groq8_daily_reset    DATE DEFAULT CURRENT_DATE,

  -- Cohere (paid users only — reranking)
  cohere_daily_used    INT DEFAULT 0,
  cohere_daily_limit   INT DEFAULT 0,
  cohere_daily_reset   DATE DEFAULT CURRENT_DATE,

  -- YouTube search
  youtube_daily_used   INT DEFAULT 0,
  youtube_daily_limit  INT DEFAULT 3,
  youtube_daily_reset  DATE DEFAULT CURRENT_DATE,

  -- Payment tracking
  paid_at          TIMESTAMPTZ,
  paid_expires     TIMESTAMPTZ,
  paystack_ref     TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Full audit trail
CREATE TABLE ai_request_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  provider        TEXT NOT NULL,
  feature         TEXT NOT NULL,
  pool_type       TEXT NOT NULL,
  requests_cost   INT DEFAULT 1,
  tokens_cost     INT DEFAULT 0,
  was_cached      BOOLEAN DEFAULT FALSE,
  drew_from_pool  BOOLEAN DEFAULT FALSE,
  user_plan       TEXT,
  response_ms     INT,
  called_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Add simple atomic incrementers for user quota updates
CREATE OR REPLACE FUNCTION increment_user_gemini_daily(p_user_id UUID, p_amount INT) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE new_val INT;
BEGIN
  UPDATE user_quota SET gemini_daily_used = gemini_daily_used + p_amount, updated_at = NOW() WHERE user_id = p_user_id RETURNING gemini_daily_used INTO new_val;
  RETURN new_val;
END; $$;

CREATE OR REPLACE FUNCTION increment_user_gemini_monthly(p_user_id UUID, p_amount INT) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE new_val INT;
BEGIN
  UPDATE user_quota SET gemini_monthly_used = gemini_monthly_used + p_amount, updated_at = NOW() WHERE user_id = p_user_id RETURNING gemini_monthly_used INTO new_val;
  RETURN new_val;
END; $$;

CREATE OR REPLACE FUNCTION increment_user_groq70_daily(p_user_id UUID, p_amount INT) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE new_val INT;
BEGIN
  UPDATE user_quota SET groq70_daily_used = groq70_daily_used + p_amount, updated_at = NOW() WHERE user_id = p_user_id RETURNING groq70_daily_used INTO new_val;
  RETURN new_val;
END; $$;

CREATE OR REPLACE FUNCTION increment_user_groq8_daily(p_user_id UUID, p_amount INT) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE new_val INT;
BEGIN
  UPDATE user_quota SET groq8_daily_used = groq8_daily_used + p_amount, updated_at = NOW() WHERE user_id = p_user_id RETURNING groq8_daily_used INTO new_val;
  RETURN new_val;
END; $$;

CREATE OR REPLACE FUNCTION increment_user_cohere_daily(p_user_id UUID, p_amount INT) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE new_val INT;
BEGIN
  UPDATE user_quota SET cohere_daily_used = cohere_daily_used + p_amount, updated_at = NOW() WHERE user_id = p_user_id RETURNING cohere_daily_used INTO new_val;
  RETURN new_val;
END; $$;

CREATE OR REPLACE FUNCTION increment_user_youtube_daily(p_user_id UUID, p_amount INT) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE new_val INT;
BEGIN
  UPDATE user_quota SET youtube_daily_used = youtube_daily_used + p_amount, updated_at = NOW() WHERE user_id = p_user_id RETURNING youtube_daily_used INTO new_val;
  RETURN new_val;
END; $$;

-- RLS policies
ALTER TABLE user_quota ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_quota_own ON user_quota
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY log_own ON ai_request_log
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE platform_ai_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_platform_ai_balance ON platform_ai_balance
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  );
