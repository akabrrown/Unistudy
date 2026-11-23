-- Migration to guarantee and atomically disburse the 20 Free Welcome AI Credits for scholars
ALTER TABLE IF EXISTS public.credit_wallets
  ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE;

-- Atomic security-definer function to claim welcome bonus credits idempotently
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_claimed BOOLEAN := FALSE;
    v_balance INT := 0;
BEGIN
    -- Check if user already claimed welcome bonus
    SELECT COALESCE(welcome_bonus_claimed, FALSE), COALESCE(balance, 0)
    INTO v_claimed, v_balance
    FROM public.credit_wallets
    WHERE user_id = p_user_id;

    IF v_claimed IS TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'already_claimed',
            'balance', v_balance
        );
    END IF;

    -- Upsert credit_wallets with 20 welcome bonus credits
    INSERT INTO public.credit_wallets (user_id, balance, total_earned, welcome_bonus_claimed, updated_at)
    VALUES (p_user_id, 20, 20, TRUE, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = credit_wallets.balance + 20,
        total_earned = COALESCE(credit_wallets.total_earned, 0) + 20,
        welcome_bonus_claimed = TRUE,
        updated_at = NOW()
    RETURNING balance INTO v_balance;

    RETURN jsonb_build_object(
        'success', true,
        'bonus_credits', 20,
        'balance', v_balance
    );
END;
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus(UUID) TO authenticated, service_role;
