-- Migration: 20261123_chat_persistence.sql
-- Description: Re-establish slide_chats table and user_chat_backups table for robust cross-browser AI Study Tutor persistence

-- 1. Create user_chat_backups table for standalone AI chat sessions
CREATE TABLE IF NOT EXISTS public.user_chat_backups (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
    active_session_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_chat_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own chat backups" ON public.user_chat_backups;
CREATE POLICY "Users can manage their own chat backups"
    ON public.user_chat_backups FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Create slide_chats table for lecture slide AI tutor conversations
CREATE TABLE IF NOT EXISTS public.slide_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slide_id TEXT NOT NULL,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, slide_id)
);

ALTER TABLE public.slide_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own slide chats" ON public.slide_chats;
CREATE POLICY "Users can manage their own slide chats"
    ON public.slide_chats FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
