-- Migration: 20261120_drop_orphan_tables.sql
-- Description: Drop unused orphan tables identified in full codebase audit and add missing RLS to quiz_questions

-- 1. Drop unused orphan tables (zero queries across frontend, backend, and mobile)
DROP TABLE IF EXISTS public.video_notes CASCADE;
DROP TABLE IF EXISTS public.pricing_features CASCADE;
DROP TABLE IF EXISTS public.platform_topup_log CASCADE;
DROP TABLE IF EXISTS public.slide_confidence CASCADE;
DROP TABLE IF EXISTS public.slide_chats CASCADE;

-- 2. Ensure quiz_questions has Row Level Security enabled
ALTER TABLE IF EXISTS public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Authenticated users can manage quiz questions for lectures in their courses
DROP POLICY IF EXISTS "Users can manage quiz questions for their lectures" ON public.quiz_questions;
CREATE POLICY "Users can manage quiz questions for their lectures"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lectures l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = quiz_questions.lecture_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = quiz_questions.lecture_id
      AND c.user_id = auth.uid()
  )
);

