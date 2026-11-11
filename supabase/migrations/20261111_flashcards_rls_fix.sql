-- Ensure users can SELECT, INSERT, UPDATE, and DELETE their own flashcards
ALTER TABLE IF EXISTS public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can insert own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can update own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can delete own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can manage their own flashcards" ON public.flashcards;

CREATE POLICY "Users can manage their own flashcards"
  ON public.flashcards
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
