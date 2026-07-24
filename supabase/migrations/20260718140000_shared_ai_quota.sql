-- ─────────────────────────────────────────────────────
-- 1. PLATFORM SHARED BALANCE (one row per provider)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_ai_balance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              TEXT NOT NULL UNIQUE,  -- 'gemini'
  total_purchased       BIGINT NOT NULL DEFAULT 50000,
  total_consumed        BIGINT DEFAULT 0,
  remaining             BIGINT GENERATED ALWAYS AS 
                          (total_purchased - total_consumed) STORED,
  alert_threshold_30    BIGINT DEFAULT 15000,
  alert_threshold_15    BIGINT DEFAULT 7500,
  suspend_free_at       BIGINT DEFAULT 2500,
  is_suspended          BOOLEAN DEFAULT FALSE,
  last_topped_up_at     TIMESTAMPTZ,
  last_topped_up_amount BIGINT,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with starting balance if not exists
INSERT INTO platform_ai_balance 
  (provider, total_purchased, alert_threshold_30, alert_threshold_15, suspend_free_at)
VALUES 
  ('gemini', 50000, 15000, 7500, 2500)
ON CONFLICT (provider) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- 2. TOP-UP HISTORY (every time you add credits)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_topup_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL,
  amount_added    BIGINT NOT NULL,
  cost_ghs        DECIMAL(10,2),
  balance_before  BIGINT,
  balance_after   BIGINT,
  notes           TEXT,
  topped_up_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 3. USER QUOTA (one row per user — upserted on signup)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_quota (
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  plan            TEXT DEFAULT 'free',       -- 'free' | 'paid'
  -- Free plan fields
  daily_used      INT DEFAULT 0,
  daily_limit     INT DEFAULT 50,
  daily_reset     DATE DEFAULT CURRENT_DATE,
  -- Paid plan fields  
  monthly_used    INT DEFAULT 0,
  monthly_limit   INT DEFAULT 200,
  monthly_reset   DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  -- Payment tracking
  paid_at         TIMESTAMPTZ,
  paid_expires    TIMESTAMPTZ,
  paystack_ref    TEXT,
  -- Upgrade prompt tracking
  upgrade_shown_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 4. EVERY AI CALL LOGGED (full audit trail)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_request_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  provider        TEXT NOT NULL,             -- 'gemini'|'groq'|'mistral' etc
  feature         TEXT NOT NULL,             -- 'slide_explanation'|'quiz' etc
  requests_cost   INT NOT NULL DEFAULT 1,    -- how many requests this consumed
  was_cached      BOOLEAN DEFAULT FALSE,     -- true = 0 cost, served from DB
  drew_from_pool  BOOLEAN DEFAULT FALSE,     -- true = deducted from shared balance
  user_plan       TEXT,                      -- plan at time of call
  tokens_used     INT,                       -- actual tokens if available
  response_ms     INT,                       -- response time in milliseconds
  called_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_log_user_date ON ai_request_log(user_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_provider   ON ai_request_log(provider, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_feature    ON ai_request_log(feature, called_at DESC);

-- ─────────────────────────────────────────────────────
-- 5. PLATFORM ALERT LOG
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type  TEXT NOT NULL,
  -- 'balance_30pct'|'balance_15pct'|'balance_suspend'|'topup_needed'
  provider    TEXT,
  message     TEXT NOT NULL,
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 6. PLATFORM SETTINGS (for Admin UI control of defaults)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS free_daily_limit INT NOT NULL DEFAULT 50;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS paid_monthly_limit INT NOT NULL DEFAULT 200;

INSERT INTO platform_settings (free_daily_limit, paid_monthly_limit)
SELECT 50, 200
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);


-- ─────────────────────────────────────────────────────
-- 7. SUPABASE ATOMIC FUNCTIONS (prevent race conditions)
-- ─────────────────────────────────────────────────────

-- Deduct from shared balance atomically
CREATE OR REPLACE FUNCTION deduct_from_balance(
  p_provider TEXT, 
  p_amount INT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  current_remaining BIGINT;
BEGIN
  SELECT remaining INTO current_remaining
  FROM platform_ai_balance
  WHERE provider = p_provider
  FOR UPDATE;  -- row-level lock prevents race condition
  
  IF current_remaining < p_amount THEN
    RETURN FALSE;  -- insufficient balance
  END IF;
  
  UPDATE platform_ai_balance SET
    total_consumed = total_consumed + p_amount,
    updated_at = NOW()
  WHERE provider = p_provider;
  
  RETURN TRUE;
END;
$$;

-- Increment user daily usage atomically
CREATE OR REPLACE FUNCTION increment_user_daily(
  p_user_id UUID,
  p_amount INT DEFAULT 1
) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  new_total INT;
BEGIN
  -- Reset if new day
  UPDATE user_quota SET
    daily_used = 0,
    daily_reset = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND daily_reset < CURRENT_DATE;
  
  UPDATE user_quota SET
    daily_used = daily_used + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING daily_used INTO new_total;
  
  RETURN new_total;
END;
$$;

-- Increment user monthly usage atomically
CREATE OR REPLACE FUNCTION increment_user_monthly(
  p_user_id UUID,
  p_amount INT DEFAULT 1
) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  new_total INT;
BEGIN
  UPDATE user_quota SET
    monthly_used = monthly_used + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING monthly_used INTO new_total;
  
  RETURN new_total;
END;
$$;

-- Add credits when topped up
CREATE OR REPLACE FUNCTION topup_platform_balance(
  p_provider TEXT,
  p_amount BIGINT,
  p_cost_ghs DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  balance_before BIGINT;
BEGIN
  SELECT remaining INTO balance_before
  FROM platform_ai_balance WHERE provider = p_provider;
  
  UPDATE platform_ai_balance SET
    total_purchased = total_purchased + p_amount,
    is_suspended = FALSE,
    last_topped_up_at = NOW(),
    last_topped_up_amount = p_amount,
    updated_at = NOW()
  WHERE provider = p_provider;
  
  INSERT INTO platform_topup_log 
    (provider, amount_added, cost_ghs, balance_before, 
     balance_after, notes)
  VALUES 
    (p_provider, p_amount, p_cost_ghs, balance_before,
     balance_before + p_amount, p_notes);
END;
$$;

-- RLS policies
ALTER TABLE user_quota ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_quota_own ON user_quota
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY log_own ON ai_request_log
  FOR SELECT USING (auth.uid() = user_id);
-- Only service role can INSERT logs

ALTER TABLE platform_ai_balance ENABLE ROW LEVEL SECURITY;
-- Only service role and admins can access this table
CREATE POLICY admin_platform_ai_balance ON platform_ai_balance
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  );

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_platform_settings ON platform_settings
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  );
