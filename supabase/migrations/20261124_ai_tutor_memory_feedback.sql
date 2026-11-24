-- Migration: 20261124_ai_tutor_memory_feedback.sql
-- Description: Persistent AI tutor memory, per-answer feedback, and chat-created flashcards without a lecture.

-- 1. Persistent tutor memory (facts the tutor remembers across chats)
CREATE TABLE IF NOT EXISTS public.tutor_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fact TEXT NOT NULL CHECK (char_length(fact) BETWEEN 3 AND 300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_memories_user ON public.tutor_memories (user_id, created_at DESC);

ALTER TABLE public.tutor_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own tutor memories" ON public.tutor_memories;
CREATE POLICY "Users manage their own tutor memories"
    ON public.tutor_memories FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Per-answer feedback
CREATE TABLE IF NOT EXISTS public.ai_message_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
    reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 500),
    model_used TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, message_id)
);

ALTER TABLE public.ai_message_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own message feedback" ON public.ai_message_feedback;
CREATE POLICY "Users manage their own message feedback"
    ON public.ai_message_feedback FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Flashcards created from chat may not belong to a lecture
ALTER TABLE IF EXISTS public.flashcards ALTER COLUMN lecture_id DROP NOT NULL;
