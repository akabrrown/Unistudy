-- Migration: YouTube Study Integration
-- Creates tables for pinning YouTube videos and taking notes on them.

-- 1. pinned_videos table
CREATE TABLE IF NOT EXISTS public.pinned_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL, -- optional: pinned from a lecture
    video_id TEXT NOT NULL, -- YouTube video ID
    title TEXT NOT NULL,
    channel TEXT,
    thumbnail_url TEXT,
    watched BOOLEAN DEFAULT FALSE,
    watch_count INT DEFAULT 0,
    pinned_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for pinned_videos
ALTER TABLE public.pinned_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own pinned videos" 
    ON public.pinned_videos FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pinned videos" 
    ON public.pinned_videos FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned videos" 
    ON public.pinned_videos FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned videos" 
    ON public.pinned_videos FOR DELETE 
    USING (auth.uid() = user_id);

-- 2. video_notes table
CREATE TABLE IF NOT EXISTS public.video_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    note_text TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint so each user has one notes record per video
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_notes_user_video ON public.video_notes(user_id, video_id);

-- RLS for video_notes
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own video notes" 
    ON public.video_notes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own video notes" 
    ON public.video_notes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own video notes" 
    ON public.video_notes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video notes" 
    ON public.video_notes FOR DELETE 
    USING (auth.uid() = user_id);
