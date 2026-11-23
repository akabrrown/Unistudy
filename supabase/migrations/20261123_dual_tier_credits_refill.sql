-- Migration: Dual-Tier Credit & 6-Hour Refill System
-- Introduces Free 6-Hour Passes (8 for Free tier, 25 for Pro) + Unmetered Permanent Paid Credits

ALTER TABLE IF EXISTS public.credit_wallets
  ADD COLUMN IF NOT EXISTS free_passes INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS free_passes_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

-- Function to check and lazily refresh free passes if 6 hours have elapsed
CREATE OR REPLACE FUNCTION public.get_or_refill_wallet(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet RECORD;
    v_max_free INT := 8;
    v_elapsed INTERVAL;
    v_refill_due BOOLEAN := FALSE;
    v_next_refill TIMESTAMPTZ;
    v_seconds_until INT;
BEGIN
    SELECT * INTO v_wallet
    FROM public.credit_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        -- Initialize wallet for first-time user: 8 free passes + 20 welcome bonus paid credits
        INSERT INTO public.credit_wallets (user_id, balance, total_earned, free_passes, free_passes_refreshed_at, tier, welcome_bonus_claimed, updated_at)
        VALUES (p_user_id, 20, 20, 8, NOW(), 'free', TRUE, NOW())
        RETURNING * INTO v_wallet;
    END IF;

    -- Determine max free passes based on tier
    IF v_wallet.tier = 'pro' THEN
        v_max_free := 25;
    ELSE
        v_max_free := 8;
    END IF;

    v_elapsed := NOW() - COALESCE(v_wallet.free_passes_refreshed_at, NOW() - INTERVAL '7 hours');

    -- If 6 hours or more elapsed, refill to max allowance
    IF v_elapsed >= INTERVAL '6 hours' THEN
        UPDATE public.credit_wallets
        SET free_passes = v_max_free,
            free_passes_refreshed_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING * INTO v_wallet;
    END IF;

    v_next_refill := v_wallet.free_passes_refreshed_at + INTERVAL '6 hours';
    v_seconds_until := GREATEST(0, EXTRACT(EPOCH FROM (v_next_refill - NOW()))::INT);

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'free_passes', v_wallet.free_passes,
        'free_passes_limit', v_max_free,
        'paid_credits', v_wallet.balance,
        'total_available', v_wallet.free_passes + v_wallet.balance,
        'tier', v_wallet.tier,
        'next_refill_at', v_next_refill,
        'seconds_until_refill', v_seconds_until
    );
END;
$$;

-- Atomic function to consume AI credit respecting Dual-Tier Priority:
-- 1. Free Passes first (burns 0 paid credits)
-- 2. Permanent Paid Credits if Free Passes are exhausted (bypasses 6h wait)
-- 3. Fails cleanly if both are 0
CREATE OR REPLACE FUNCTION public.consume_ai_credit_dual_tier(
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet RECORD;
    v_max_free INT := 8;
    v_elapsed INTERVAL;
    v_free_passes INT;
    v_paid_balance INT;
    v_deducted_from TEXT := 'none';
    v_next_refill TIMESTAMPTZ;
    v_seconds_until INT;
    v_needed INT := p_amount;
BEGIN
    SELECT * INTO v_wallet
    FROM public.credit_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        -- Initialize wallet for first-time user
        INSERT INTO public.credit_wallets (user_id, balance, total_earned, free_passes, free_passes_refreshed_at, tier, welcome_bonus_claimed, updated_at)
        VALUES (p_user_id, 20, 20, 8, NOW(), 'free', TRUE, NOW())
        RETURNING * INTO v_wallet;
    END IF;

    IF v_wallet.tier = 'pro' THEN
        v_max_free := 25;
    ELSE
        v_max_free := 8;
    END IF;

    -- Check lazy refill first
    v_elapsed := NOW() - COALESCE(v_wallet.free_passes_refreshed_at, NOW() - INTERVAL '7 hours');
    IF v_elapsed >= INTERVAL '6 hours' THEN
        v_wallet.free_passes := v_max_free;
        v_wallet.free_passes_refreshed_at := NOW();
    END IF;

    v_free_passes := v_wallet.free_passes;
    v_paid_balance := v_wallet.balance;

    -- Check if total available covers amount
    IF (v_free_passes + v_paid_balance) < p_amount THEN
        v_next_refill := v_wallet.free_passes_refreshed_at + INTERVAL '6 hours';
        v_seconds_until := GREATEST(0, EXTRACT(EPOCH FROM (v_next_refill - NOW()))::INT);

        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'insufficient_credits',
            'free_passes', v_free_passes,
            'free_passes_limit', v_max_free,
            'paid_credits', v_paid_balance,
            'total_available', v_free_passes + v_paid_balance,
            'seconds_until_refill', v_seconds_until,
            'next_refill_at', v_next_refill
        );
    END IF;

    -- Deduct priority: Free Passes first
    IF v_free_passes >= v_needed THEN
        v_free_passes := v_free_passes - v_needed;
        v_deducted_from := 'free';
    ELSE
        -- Mixed or Paid only
        IF v_free_passes > 0 THEN
            v_needed := v_needed - v_free_passes;
            v_free_passes := 0;
            v_paid_balance := v_paid_balance - v_needed;
            v_deducted_from := 'mixed';
        ELSE
            v_paid_balance := v_paid_balance - v_needed;
            v_deducted_from := 'paid';
        END IF;
    END IF;

    -- Atomically update credit_wallets
    UPDATE public.credit_wallets
    SET free_passes = v_free_passes,
        balance = v_paid_balance,
        free_passes_refreshed_at = v_wallet.free_passes_refreshed_at,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    v_next_refill := v_wallet.free_passes_refreshed_at + INTERVAL '6 hours';
    v_seconds_until := GREATEST(0, EXTRACT(EPOCH FROM (v_next_refill - NOW()))::INT);

    RETURN jsonb_build_object(
        'allowed', true,
        'deducted_from', v_deducted_from,
        'amount_deducted', p_amount,
        'free_passes', v_free_passes,
        'free_passes_limit', v_max_free,
        'paid_credits', v_paid_balance,
        'total_available', v_free_passes + v_paid_balance,
        'seconds_until_refill', v_seconds_until,
        'next_refill_at', v_next_refill
    );
END;
$$;

-- Grant execute permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.get_or_refill_wallet(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit_dual_tier(UUID, INTEGER) TO authenticated, service_role;
