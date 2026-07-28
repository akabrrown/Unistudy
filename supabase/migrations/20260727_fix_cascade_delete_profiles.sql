-- Fix: add ON DELETE CASCADE to every FK that points at profiles(id)
-- Without this, deleting a user from auth.users cascades to profiles,
-- but profiles deletion is blocked by child rows in these tables.
-- Each block is guarded so missing tables are silently skipped.

DO $$ BEGIN
  ALTER TABLE confidence_ratings DROP CONSTRAINT IF EXISTS confidence_ratings_user_id_fkey;
  ALTER TABLE confidence_ratings ADD CONSTRAINT confidence_ratings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE last_position DROP CONSTRAINT IF EXISTS last_position_user_id_fkey;
  ALTER TABLE last_position ADD CONSTRAINT last_position_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;
  ALTER TABLE flashcards ADD CONSTRAINT flashcards_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
  ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE past_papers DROP CONSTRAINT IF EXISTS past_papers_user_id_fkey;
  ALTER TABLE past_papers ADD CONSTRAINT past_papers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE past_paper_attempts DROP CONSTRAINT IF EXISTS past_paper_attempts_user_id_fkey;
  ALTER TABLE past_paper_attempts ADD CONSTRAINT past_paper_attempts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_user_id_fkey;
  ALTER TABLE assignments ADD CONSTRAINT assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE study_goals DROP CONSTRAINT IF EXISTS study_goals_user_id_fkey;
  ALTER TABLE study_goals ADD CONSTRAINT study_goals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE study_sessions DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;
  ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE mood_checkins DROP CONSTRAINT IF EXISTS mood_checkins_user_id_fkey;
  ALTER TABLE mood_checkins ADD CONSTRAINT mood_checkins_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE study_groups DROP CONSTRAINT IF EXISTS study_groups_created_by_fkey;
  ALTER TABLE study_groups ADD CONSTRAINT study_groups_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE study_group_members DROP CONSTRAINT IF EXISTS study_group_members_user_id_fkey;
  ALTER TABLE study_group_members ADD CONSTRAINT study_group_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_user_id_fkey;
  ALTER TABLE friendships ADD CONSTRAINT friendships_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_friend_id_fkey;
  ALTER TABLE friendships ADD CONSTRAINT friendships_friend_id_fkey
    FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_user_id_fkey;
  ALTER TABLE achievements ADD CONSTRAINT achievements_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE victory_log DROP CONSTRAINT IF EXISTS victory_log_user_id_fkey;
  ALTER TABLE victory_log ADD CONSTRAINT victory_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE textbooks DROP CONSTRAINT IF EXISTS textbooks_user_id_fkey;
  ALTER TABLE textbooks ADD CONSTRAINT textbooks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stripe_customers DROP CONSTRAINT IF EXISTS stripe_customers_user_id_fkey;
  ALTER TABLE stripe_customers ADD CONSTRAINT stripe_customers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_user_id_fkey;
  ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
  ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey
    FOREIGN KEY (referrer_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;
  ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_user_id_fkey;
  ALTER TABLE ai_usage_logs ADD CONSTRAINT ai_usage_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ai_request_log DROP CONSTRAINT IF EXISTS ai_request_log_user_id_fkey;
  ALTER TABLE ai_request_log ADD CONSTRAINT ai_request_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE material_access DROP CONSTRAINT IF EXISTS material_access_recipient_id_fkey;
  ALTER TABLE material_access ADD CONSTRAINT material_access_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE discussion_threads DROP CONSTRAINT IF EXISTS discussion_threads_author_id_fkey;
  ALTER TABLE discussion_threads ADD CONSTRAINT discussion_threads_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE discussion_replies DROP CONSTRAINT IF EXISTS discussion_replies_author_id_fkey;
  ALTER TABLE discussion_replies ADD CONSTRAINT discussion_replies_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE audio_rooms DROP CONSTRAINT IF EXISTS audio_rooms_host_id_fkey;
  ALTER TABLE audio_rooms ADD CONSTRAINT audio_rooms_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
  ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
  ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey;
  ALTER TABLE direct_messages ADD CONSTRAINT direct_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey;
  ALTER TABLE direct_messages ADD CONSTRAINT direct_messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
