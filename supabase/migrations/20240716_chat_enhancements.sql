-- Add is_pinned to group_messages
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_type TEXT NOT NULL CHECK (message_type IN ('direct', 'group')),
    message_id UUID NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_type, message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message reactions"
    ON public.message_reactions FOR SELECT
    USING (true); -- In a real app we'd scope to group/dm access, but simple for MVP

CREATE POLICY "Users can add their own reactions"
    ON public.message_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
    ON public.message_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- Update real-time publication to include message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
