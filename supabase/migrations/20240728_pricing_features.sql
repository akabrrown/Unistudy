CREATE TABLE IF NOT EXISTS public.pricing_features (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    is_free boolean DEFAULT false,
    is_pro boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.pricing_features ENABLE ROW LEVEL SECURITY;

-- Allow public read access so the pricing page can display them to anyone
CREATE POLICY "Allow public read access to pricing_features" 
    ON public.pricing_features FOR SELECT 
    USING (true);

-- Allow full access to admins (for simplicity we can check the profiles role, or if service role is used)
-- We will use the service_role key to update these from the backend API.
-- So no additional policies are strictly required for write access since service_role bypasses RLS.

-- Insert initial feature seed data
INSERT INTO public.pricing_features (name, description, is_free, is_pro, order_index)
VALUES
    ('AI Note Generation', 'Instantly turn slides and PDFs into comprehensive, structured notes.', true, true, 1),
    ('YouTube Summarizer', 'Paste any educational YouTube link to instantly extract summaries, key points, and study notes.', false, true, 2),
    ('Essay Grader', 'Get instant AI feedback, structural analysis, and improvement suggestions for your essays.', false, true, 3),
    ('University Tailored', 'Course material and metrics precisely matched to your institution and degree programme.', true, true, 4),
    ('Gamified Learning', 'Earn XP, level up, and unlock prestigious titles as you complete study sessions.', true, true, 5),
    ('Audio Study Rooms', 'Jump into live, crystal-clear audio rooms with your peers for real-time collaboration.', false, true, 6),
    ('Wellbeing Tracker', 'Log your mood, track your study efforts, and get AI-suggested breaks to prevent burnout.', true, true, 7),
    ('Semantic Search', 'Ask questions and get answers cited directly from your course materials.', true, true, 8),
    ('Interactive Profiles', 'Customize your avatar, track your analytics, and connect with peers seamlessly.', true, true, 9),
    ('Smart Flashcards', 'Auto-generated spaced repetition flashcards that adapt to your memory curve.', true, true, 10),
    ('Note Scanning (OCR)', 'Scan your handwritten notes and instantly convert them into searchable digital materials.', false, true, 11),
    ('Performance Analytics', 'Track your progress, identify weak points, and improve your scores through data.', false, true, 12);
