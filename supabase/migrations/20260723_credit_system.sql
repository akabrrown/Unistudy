-- Create credit_wallets table
CREATE TABLE IF NOT EXISTS credit_wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY credit_wallets_own ON credit_wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Drop deprecated columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS plan;
ALTER TABLE profiles DROP COLUMN IF EXISTS streak_days;
ALTER TABLE profiles DROP COLUMN IF EXISTS total_xp;

-- Drop deprecated columns from user_quota
ALTER TABLE user_quota DROP COLUMN IF EXISTS plan;
ALTER TABLE user_quota DROP COLUMN IF EXISTS monthly_limit;
ALTER TABLE user_quota DROP COLUMN IF EXISTS monthly_used;
ALTER TABLE user_quota DROP COLUMN IF EXISTS monthly_reset;
ALTER TABLE user_quota DROP COLUMN IF EXISTS paid_at;
ALTER TABLE user_quota DROP COLUMN IF EXISTS paid_expires;
ALTER TABLE user_quota DROP COLUMN IF EXISTS paystack_ref;

-- Drop legacy community and gamification tables
DROP TABLE IF EXISTS study_group_members CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS doubt_board CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS discussion_replies CASCADE;
DROP TABLE IF EXISTS discussion_threads CASCADE;
DROP TABLE IF EXISTS audio_rooms CASCADE;
DROP TABLE IF EXISTS material_access CASCADE;
DROP TABLE IF EXISTS shared_materials CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS victory_log CASCADE;
DROP TABLE IF EXISTS textbook_chunks CASCADE;
DROP TABLE IF EXISTS textbooks CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- RPC for consuming credits
CREATE OR REPLACE FUNCTION decrement_credit_wallet(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE credit_wallets 
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND balance >= p_amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
END;
$$ LANGUAGE plpgsql;
