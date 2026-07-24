-- Create slide notes table
CREATE TABLE IF NOT EXISTS public.slide_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slide_id UUID NOT NULL REFERENCES public.slides(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, slide_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.slide_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slide notes" 
    ON public.slide_notes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slide notes" 
    ON public.slide_notes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slide notes" 
    ON public.slide_notes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own slide notes" 
    ON public.slide_notes FOR DELETE 
    USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_slide_notes_updated_at
    BEFORE UPDATE ON public.slide_notes
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
