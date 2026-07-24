-- Migration: Phase 1 Auth Enhancements

-- Extend profiles table with new columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'preset',
  ADD COLUMN IF NOT EXISTS institutional_email TEXT,
  ADD COLUMN IF NOT EXISTS email_is_institutional BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id),
  ADD COLUMN IF NOT EXISTS degree_programme TEXT,
  ADD COLUMN IF NOT EXISTS study_frequency TEXT,
  ADD COLUMN IF NOT EXISTS study_hours_per_session TEXT;

-- Create course_programmes table (user‑typed programmes, optional grouping)
CREATE TABLE IF NOT EXISTS public.course_programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  field TEXT, -- optional, e.g., Engineering, Business, Health
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create study_schedule_templates table to store generated planner JSON
CREATE TABLE IF NOT EXISTS public.study_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh materialised view after signup – trigger will be added in the signup API.
