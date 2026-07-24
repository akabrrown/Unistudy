-- S10 Past Papers Feature

-- S10 Past Papers Feature

DO $$ BEGIN
    CREATE TYPE exam_type_enum AS ENUM ('mid-semester', 'end-semester', 'resit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE past_paper_status_enum AS ENUM ('processing', 'ready', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE drill_difficulty_enum AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS past_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    exam_type exam_type_enum NOT NULL,
    status past_paper_status_enum DEFAULT 'processing',
    shared_to_community BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist in case the table was created previously without them
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS exam_type exam_type_enum;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS status past_paper_status_enum DEFAULT 'processing';
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS shared_to_community BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS past_paper_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    past_paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE,
    page_number INT,
    image_url TEXT
);
ALTER TABLE past_paper_pages ADD COLUMN IF NOT EXISTS past_paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE;
ALTER TABLE past_paper_pages ADD COLUMN IF NOT EXISTS page_number INT;
ALTER TABLE past_paper_pages ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS past_paper_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    past_paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE,
    question_number TEXT,
    text_content TEXT,
    extracted_topic TEXT,
    marks_available INT DEFAULT 1
);
ALTER TABLE past_paper_questions ADD COLUMN IF NOT EXISTS past_paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE;
ALTER TABLE past_paper_questions ADD COLUMN IF NOT EXISTS question_number TEXT;
ALTER TABLE past_paper_questions ADD COLUMN IF NOT EXISTS text_content TEXT;
ALTER TABLE past_paper_questions ADD COLUMN IF NOT EXISTS extracted_topic TEXT;
ALTER TABLE past_paper_questions ADD COLUMN IF NOT EXISTS marks_available INT DEFAULT 1;

CREATE TABLE IF NOT EXISTS past_paper_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    past_paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    time_limit_minutes INT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    score_percentage NUMERIC(5, 2)
);
ALTER TABLE past_paper_attempts ADD COLUMN IF NOT EXISTS past_paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE;
ALTER TABLE past_paper_attempts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE past_paper_attempts ADD COLUMN IF NOT EXISTS time_limit_minutes INT;
ALTER TABLE past_paper_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE past_paper_attempts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE past_paper_attempts ADD COLUMN IF NOT EXISTS score_percentage NUMERIC(5, 2);

CREATE TABLE IF NOT EXISTS past_paper_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES past_paper_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES past_paper_questions(id) ON DELETE CASCADE,
    user_answer_text TEXT,
    user_answer_image_url TEXT,
    marks_awarded INT,
    feedback TEXT,
    model_answer TEXT
);
ALTER TABLE past_paper_answers ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES past_paper_attempts(id) ON DELETE CASCADE;
ALTER TABLE past_paper_answers ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES past_paper_questions(id) ON DELETE CASCADE;
ALTER TABLE past_paper_answers ADD COLUMN IF NOT EXISTS user_answer_text TEXT;
ALTER TABLE past_paper_answers ADD COLUMN IF NOT EXISTS user_answer_image_url TEXT;
ALTER TABLE past_paper_answers ADD COLUMN IF NOT EXISTS marks_awarded INT;
ALTER TABLE past_paper_answers ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE past_paper_answers ADD COLUMN IF NOT EXISTS model_answer TEXT;

CREATE TABLE IF NOT EXISTS weakness_drills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    difficulty_level drill_difficulty_enum DEFAULT 'medium',
    consecutive_correct INT DEFAULT 0,
    mastered BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE weakness_drills ENABLE ROW LEVEL SECURITY;

-- 1. past_papers: users can see papers they uploaded OR papers shared to community for a course in their institution
CREATE POLICY "View past papers" ON past_papers
FOR SELECT USING (
    user_id = auth.uid() 
    OR (
        shared_to_community = true 
        AND (
            SELECT institution_id FROM profiles WHERE id = auth.uid()
        ) = (
            SELECT institution_id FROM profiles WHERE id = past_papers.user_id
        )
    )
);

CREATE POLICY "Insert past papers" ON past_papers
FOR INSERT WITH CHECK (user_id = auth.uid());

-- 2. pages & questions: inherit from past_papers
CREATE POLICY "View past paper pages" ON past_paper_pages
FOR SELECT USING (
    past_paper_id IN (SELECT id FROM past_papers) -- Relies on past_papers SELECT policy
);
CREATE POLICY "Insert past paper pages" ON past_paper_pages
FOR INSERT WITH CHECK (
    past_paper_id IN (SELECT id FROM past_papers WHERE user_id = auth.uid())
);

CREATE POLICY "View past paper questions" ON past_paper_questions
FOR SELECT USING (
    past_paper_id IN (SELECT id FROM past_papers)
);
CREATE POLICY "Insert past paper questions" ON past_paper_questions
FOR INSERT WITH CHECK (
    past_paper_id IN (SELECT id FROM past_papers WHERE user_id = auth.uid())
);

-- 3. Attempts and Answers (User private)
CREATE POLICY "Manage past paper attempts" ON past_paper_attempts
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Manage past paper answers" ON past_paper_answers
FOR ALL USING (
    attempt_id IN (SELECT id FROM past_paper_attempts WHERE user_id = auth.uid())
);

-- 4. Weakness Drills (User private)
CREATE POLICY "Manage weakness drills" ON weakness_drills
FOR ALL USING (user_id = auth.uid());
