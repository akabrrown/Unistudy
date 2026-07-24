-- Create slide chats table
CREATE TABLE IF NOT EXISTS public.slide_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slide_id UUID NOT NULL REFERENCES public.slides(id) ON DELETE CASCADE,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, slide_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.slide_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slide chats" 
    ON public.slide_chats FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slide chats" 
    ON public.slide_chats FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slide chats" 
    ON public.slide_chats FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own slide chats" 
    ON public.slide_chats FOR DELETE 
    USING (auth.uid() = user_id);

CREATE TRIGGER handle_slide_chats_updated_at
    BEFORE UPDATE ON public.slide_chats
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
