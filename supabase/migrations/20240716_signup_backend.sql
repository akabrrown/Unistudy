-- Create course_programmes table
CREATE TABLE IF NOT EXISTS public.course_programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    field TEXT,
    level TEXT DEFAULT 'undergraduate'
);

-- Old seed data removed; new seed will be in a separate migration

-- Create study_schedule_templates table
CREATE TABLE IF NOT EXISTS public.study_schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    schedule JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.course_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_schedule_templates ENABLE ROW LEVEL SECURITY;

-- Policy "Anyone can view course programmes" already exists; removed duplicate

-- Policy "Users can view their own schedule templates" already exists; removed duplicate

-- Policy "Users can insert their own schedule templates" already exists; removed duplicate
