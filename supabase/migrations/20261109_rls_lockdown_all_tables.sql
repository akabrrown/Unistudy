-- ==============================================================================
-- Migration: 20261109_rls_lockdown_all_tables.sql
-- Description: Comprehensive Row Level Security (RLS) lockdown.
-- Revokes all public read access to user data (lectures, slides, courses, profiles)
-- and guarantees users can strictly only access and mutate their own data.
-- ==============================================================================

-- 1. COURSES
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can manage their own courses" ON public.courses;

CREATE POLICY "Users can manage their own courses"
  ON public.courses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. LECTURES
ALTER TABLE IF EXISTS public.lectures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can view own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can insert own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can update own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can delete own lectures" ON public.lectures;
DROP POLICY IF EXISTS "Users can manage their own lectures" ON public.lectures;

CREATE POLICY "Users can manage their own lectures"
  ON public.lectures
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. SLIDES
ALTER TABLE IF EXISTS public.slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to slides" ON public.slides;
DROP POLICY IF EXISTS "Users can view slides of their own lectures" ON public.slides;
DROP POLICY IF EXISTS "Users can manage slides of their own lectures" ON public.slides;

CREATE POLICY "Users can view slides of their own lectures"
  ON public.slides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lectures
      WHERE public.lectures.id = public.slides.lecture_id
      AND public.lectures.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify slides of their own lectures"
  ON public.slides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lectures
      WHERE public.lectures.id = public.slides.lecture_id
      AND public.lectures.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lectures
      WHERE public.lectures.id = public.slides.lecture_id
      AND public.lectures.user_id = auth.uid()
    )
  );

-- 4. FLASHCARDS
ALTER TABLE IF EXISTS public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can manage their own flashcards" ON public.flashcards;

CREATE POLICY "Users can manage their own flashcards"
  ON public.flashcards
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. QUIZ ATTEMPTS
ALTER TABLE IF EXISTS public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Users can manage their own quiz attempts"
  ON public.quiz_attempts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. PROFILES
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view and manage all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view and manage all profiles"
  ON public.profiles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. CREDIT WALLETS
ALTER TABLE IF EXISTS public.credit_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_wallets_own" ON public.credit_wallets;
CREATE POLICY "credit_wallets_own"
  ON public.credit_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Prevent unauthorized direct mutation of credit wallets from client:
-- Only service_role or vetted security definer RPC functions can alter balance.
DROP POLICY IF EXISTS "credit_wallets_no_client_insert" ON public.credit_wallets;
DROP POLICY IF EXISTS "credit_wallets_no_client_update" ON public.credit_wallets;

-- 8. SLIDE NOTES & CHATS
ALTER TABLE IF EXISTS public.slide_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.slide_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own slide notes" ON public.slide_notes;
DROP POLICY IF EXISTS "Users can insert their own slide notes" ON public.slide_notes;
DROP POLICY IF EXISTS "Users can update their own slide notes" ON public.slide_notes;
DROP POLICY IF EXISTS "Users can delete their own slide notes" ON public.slide_notes;

CREATE POLICY "Users can manage their own slide notes"
  ON public.slide_notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own slide chats" ON public.slide_chats;
DROP POLICY IF EXISTS "Users can insert their own slide chats" ON public.slide_chats;
DROP POLICY IF EXISTS "Users can update their own slide chats" ON public.slide_chats;
DROP POLICY IF EXISTS "Users can delete their own slide chats" ON public.slide_chats;

CREATE POLICY "Users can manage their own slide chats"
  ON public.slide_chats
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. USER SETTINGS & CALENDAR EVENTS
ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;

CREATE POLICY "Users can manage their own settings"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;

CREATE POLICY "Users can manage their own calendar events"
  ON public.calendar_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 10. AI KEYS & ADMIN AUDIT LOGS
ALTER TABLE IF EXISTS public.ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view API keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Admins can insert API keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Admins can update API keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Admins can delete API keys" ON public.ai_api_keys;

CREATE POLICY "Admins can manage API keys"
  ON public.ai_api_keys
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
