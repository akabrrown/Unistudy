-- Saved Hybrid Exam Focus Packs ("Areas of Concentration")
CREATE TABLE IF NOT EXISTS public.exam_focus_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  raw_areas_input text NOT NULL,
  areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  areas_hash text NOT NULL,
  matched_slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  matched_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  study_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  coverage_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_focus_packs_user_course
  ON public.exam_focus_packs (user_id, course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_focus_packs_lookup
  ON public.exam_focus_packs (user_id, course_id, areas_hash);

ALTER TABLE public.exam_focus_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own exam focus packs" ON public.exam_focus_packs;
DROP POLICY IF EXISTS "Users can insert own exam focus packs" ON public.exam_focus_packs;
DROP POLICY IF EXISTS "Users can update own exam focus packs" ON public.exam_focus_packs;
DROP POLICY IF EXISTS "Users can delete own exam focus packs" ON public.exam_focus_packs;

CREATE POLICY "Users can select own exam focus packs"
  ON public.exam_focus_packs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam focus packs"
  ON public.exam_focus_packs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = exam_focus_packs.course_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own exam focus packs"
  ON public.exam_focus_packs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = exam_focus_packs.course_id
        AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own exam focus packs"
  ON public.exam_focus_packs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
