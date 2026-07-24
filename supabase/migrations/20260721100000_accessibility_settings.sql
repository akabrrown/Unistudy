-- Accessibility and General User Settings

CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Display Preferences
    theme TEXT NOT NULL DEFAULT 'light', -- 'light', 'dark'
    font_family TEXT NOT NULL DEFAULT 'inter', -- 'inter', 'opendyslexic'
    text_size TEXT NOT NULL DEFAULT 'normal', -- 'small', 'normal', 'large', 'extra-large'
    line_spacing TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'double'
    color_blind_mode TEXT, -- null, 'deuteranopia', 'protanopia', 'achromatopsia'
    high_contrast BOOLEAN NOT NULL DEFAULT false,
    
    -- AI Preferences
    ai_tutor_name TEXT NOT NULL DEFAULT 'Uni',
    ai_personality TEXT NOT NULL DEFAULT 'neutral', -- 'encouraging', 'strict', 'funny', 'neutral'
    ai_reading_level TEXT NOT NULL DEFAULT 'intermediate', -- 'simplified', 'beginner', 'intermediate', 'advanced', 'expert'
    ai_tone TEXT NOT NULL DEFAULT 'academic', -- 'academic', 'casual'
    learning_style TEXT, -- 'visual', 'auditory', 'reading_writing', 'kinaesthetic'
    
    -- Language & Performance
    language TEXT NOT NULL DEFAULT 'en', -- 'en', 'fr', 'tw', 'ha', 'yo', 'sw'
    low_bandwidth BOOLEAN NOT NULL DEFAULT false,
    simplified_mode BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER handle_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add user_settings trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings() 
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically create default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();
