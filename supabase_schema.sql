CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════
-- USERS & PROFILES
-- ═══════════════════════════════════════════════════════
CREATE TABLE profiles (
id UUID REFERENCES auth.users(id) PRIMARY KEY,
email TEXT NOT NULL,
full_name TEXT,
avatar_url TEXT,
role TEXT DEFAULT 'student', -- 'student'|'lecturer'|'admin'
university TEXT,
degree TEXT,
year_of_study INT,
learning_style TEXT DEFAULT 'adaptive', -- 'visual'|'auditory'|'reading'|'kinaesthetic'
tutor_name TEXT DEFAULT 'Alex',
tutor_personality TEXT DEFAULT 'encouraging',
reading_level INT DEFAULT 3, -- 1 (simple) to 5 (expert)
theme TEXT DEFAULT 'light',
language TEXT DEFAULT 'en',
plan TEXT DEFAULT 'free', -- 'free'|'pro'|'enterprise'
streak_days INT DEFAULT 0,
total_xp INT DEFAULT 0,
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE user_preferences (
user_id UUID REFERENCES profiles(id) PRIMARY KEY,
dyslexia_font BOOLEAN DEFAULT FALSE,
high_contrast BOOLEAN DEFAULT FALSE,
text_size TEXT DEFAULT 'normal',
line_spacing TEXT DEFAULT 'normal',
colour_blind TEXT DEFAULT 'none', -- 'none'|'deuteranopia'|'protanopia'
simplified_mode BOOLEAN DEFAULT FALSE,
notif_email JSONB DEFAULT '{}'::JSONB,
notif_push JSONB DEFAULT '{}'::JSONB
);
-- ═══════════════════════════════════════════════════════
-- COURSES & LECTURES
-- ═══════════════════════════════════════════════════════
CREATE TABLE courses (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
title TEXT NOT NULL,
course_code TEXT,
description TEXT,
colour TEXT DEFAULT '#5B2D8E',
semester TEXT,
year INT,
archived BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE lectures (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
title TEXT NOT NULL,
week INT,
file_url TEXT,
slide_count INT DEFAULT 0,
difficulty INT, -- 1-10 AI rated
quality_score TEXT, -- 'excellent'|'good'|'needs_attention'
tags TEXT[], -- AI auto-generated tags
processing BOOLEAN DEFAULT FALSE, -- true while converter runs
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE slides (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
slide_number INT NOT NULL,
image_url TEXT NOT NULL, -- Cloudinary PNG
raw_text TEXT, -- OCR extracted text
explanation TEXT, -- AI explanation (cached)
gap_filled TEXT, -- Gap filler output
embedding vector(384), -- HuggingFace embedding
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON slides(lecture_id, slide_number);
CREATE INDEX ON slides USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE TABLE student_notes (
slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
note_text TEXT,
merged_doc TEXT,
updated_at TIMESTAMPTZ DEFAULT NOW(),
PRIMARY KEY (slide_id, user_id)
);
CREATE TABLE confidence_ratings (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
slide_id UUID REFERENCES slides(id),
rating INT CHECK (rating BETWEEN 1 AND 5),
rated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE lecture_tags (
lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
tag TEXT NOT NULL,
confidence FLOAT,
PRIMARY KEY (lecture_id, tag)
);
CREATE TABLE last_position (
user_id UUID REFERENCES profiles(id) PRIMARY KEY,
lecture_id UUID REFERENCES lectures(id),
slide_number INT DEFAULT 1,
device_name TEXT,
updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- FLASHCARDS
-- ═══════════════════════════════════════════════════════
CREATE TABLE flashcards (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
user_id UUID REFERENCES profiles(id),
front TEXT NOT NULL,
back TEXT NOT NULL,
tags TEXT[],
embedding vector(384),
-- SM-2 spaced repetition fields
ease_factor FLOAT DEFAULT 2.5,
interval_days INT DEFAULT 1,
repetitions INT DEFAULT 0,
next_review TIMESTAMPTZ DEFAULT NOW(),
last_rating TEXT, -- 'again'|'hard'|'good'|'easy'
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON flashcards(lecture_id, next_review);
CREATE INDEX ON flashcards USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- ═══════════════════════════════════════════════════════
-- QUIZZES
-- ═══════════════════════════════════════════════════════
CREATE TABLE quiz_questions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
question TEXT NOT NULL,
options JSONB, -- [{label, text}]
correct_option TEXT NOT NULL,
explanation TEXT,
difficulty INT DEFAULT 5,
type TEXT DEFAULT 'mcq', -- 'mcq'|'true_false'|'short'
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE quiz_attempts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
lecture_id UUID REFERENCES lectures(id),
score FLOAT,
total INT,
time_taken INT,
completed_at TIMESTAMPTZ DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- PAST PAPERS
-- ═══════════════════════════════════════════════════════
CREATE TABLE past_papers (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
user_id UUID REFERENCES profiles(id),
title TEXT NOT NULL,
year INT,
exam_type TEXT,
page_count INT,
is_shared BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE past_paper_pages (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE,
page_number INT NOT NULL,
image_url TEXT NOT NULL,
extracted_text TEXT
);
CREATE TABLE past_paper_attempts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
paper_id UUID REFERENCES past_papers(id),
user_id UUID REFERENCES profiles(id),
score FLOAT,
time_taken INT,
completed BOOLEAN DEFAULT FALSE,
started_at TIMESTAMPTZ DEFAULT NOW(),
completed_at TIMESTAMPTZ
);
CREATE TABLE past_paper_answers (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
attempt_id UUID REFERENCES past_paper_attempts(id),
question_num INT NOT NULL,
student_answer TEXT,
ai_score FLOAT,
ai_feedback TEXT,
marks_awarded FLOAT,
marks_total FLOAT
);
-- ═══════════════════════════════════════════════════════
-- STUDY ORGANISATION
-- ═══════════════════════════════════════════════════════
CREATE TABLE assignments (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
course_id UUID REFERENCES courses(id),
user_id UUID REFERENCES profiles(id),
title TEXT NOT NULL,
due_date TIMESTAMPTZ,
weight FLOAT,
status TEXT DEFAULT 'todo',
grade FLOAT
);
CREATE TABLE study_goals (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
goal_type TEXT NOT NULL,
target INT NOT NULL,
current INT DEFAULT 0,
week_start DATE NOT NULL
);
CREATE TABLE study_sessions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
lecture_id UUID REFERENCES lectures(id),
duration_secs INT,
slides_viewed INT,
session_date DATE DEFAULT CURRENT_DATE
);
CREATE TABLE mood_checkins (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
mood INT CHECK (mood BETWEEN 1 AND 5),
exam_id UUID,
checked_at TIMESTAMPTZ DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- COMMUNITY & SOCIAL
-- ═══════════════════════════════════════════════════════
CREATE TABLE study_groups (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
course_id UUID REFERENCES courses(id),
name TEXT NOT NULL,
invite_code TEXT UNIQUE NOT NULL,
created_by UUID REFERENCES profiles(id),
max_members INT DEFAULT 10
);
CREATE TABLE study_group_members (
group_id UUID REFERENCES study_groups(id),
user_id UUID REFERENCES profiles(id),
role TEXT DEFAULT 'member',
joined_at TIMESTAMPTZ DEFAULT NOW(),
PRIMARY KEY (group_id, user_id)
);
CREATE TABLE friendships (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
friend_id UUID REFERENCES profiles(id),
status TEXT DEFAULT 'pending',
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE doubt_board (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
course_id UUID REFERENCES courses(id),
question TEXT NOT NULL,
ai_answer TEXT,
upvotes INT DEFAULT 0,
created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- GAMIFICATION
-- ═══════════════════════════════════════════════════════
CREATE TABLE achievements (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
badge_type TEXT NOT NULL,
earned_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE victory_log (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
entry TEXT NOT NULL,
ai_suggested BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- TEXTBOOKS & GLOSSARY
-- ═══════════════════════════════════════════════════════
CREATE TABLE textbooks (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
course_id UUID REFERENCES courses(id),
user_id UUID REFERENCES profiles(id),
title TEXT NOT NULL,
page_count INT
);
CREATE TABLE textbook_chunks (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
page_number INT,
chunk_text TEXT NOT NULL,
embedding vector(384)
);
CREATE INDEX ON textbook_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE TABLE glossary_terms (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
course_id UUID REFERENCES courses(id),
lecture_id UUID REFERENCES lectures(id),
term TEXT NOT NULL,
definition TEXT NOT NULL,
first_slide INT,
user_note TEXT
);
-- ═══════════════════════════════════════════════════════
-- PAYMENTS & SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════
CREATE TABLE stripe_customers (
user_id UUID REFERENCES profiles(id) PRIMARY KEY,
stripe_customer_id TEXT UNIQUE NOT NULL
);
CREATE TABLE subscriptions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id) UNIQUE,
plan TEXT NOT NULL,
status TEXT DEFAULT 'active',
stripe_sub_id TEXT UNIQUE,
stripe_price_id TEXT,
current_period_end TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE payment_transactions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
amount INT,
currency TEXT DEFAULT 'GHS',
status TEXT,
reference TEXT UNIQUE,
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE referrals (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
referrer_id UUID REFERENCES profiles(id),
referred_email TEXT NOT NULL,
referral_code TEXT UNIQUE NOT NULL,
status TEXT DEFAULT 'pending',
months_awarded INT DEFAULT 0,
created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ═══════════════════════════════════════════════════════
-- ADMIN & AUDIT
-- ═══════════════════════════════════════════════════════
CREATE TABLE audit_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
admin_id UUID REFERENCES profiles(id),
action TEXT NOT NULL,
target_user_id UUID,
details JSONB,
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE ai_usage_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id),
provider TEXT NOT NULL,
feature TEXT NOT NULL,
tokens_used INT,
created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE platform_settings (
key TEXT PRIMARY KEY,
value TEXT NOT NULL,
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- PHASE 8: INFRASTRUCTURE & OPTIMIZATION --
CREATE EXTENSION IF NOT EXISTS vector;

-- Performance Indices
CREATE INDEX IF NOT EXISTS idx_slides_lecture ON public.slides(lecture_id, slide_number);
CREATE INDEX IF NOT EXISTS idx_courses_user ON public.courses(user_id, created_at DESC);

-- Vector Search Indices for ultra-fast cosine distance search
-- (Assuming embedding columns were created as type 'vector' in actual migrations)
-- Note: ivfflat index requires enough rows to build clusters effectively
CREATE INDEX IF NOT EXISTS idx_slides_embedding ON public.slides 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);


-- RLS Policies Example (to be expanded)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ANALYTICS PHASE 9 FUNCTIONS --

-- 1. get_mastery_velocity
CREATE OR REPLACE FUNCTION get_mastery_velocity(p_user_id UUID)
RETURNS TABLE(lecture_title TEXT, first_viewed DATE, first_mastered DATE, days_to_master INT)
LANGUAGE sql STABLE AS $$
SELECT l.title,
       MIN(ss.session_date) AS first_viewed,
       MIN(qa.completed_at::DATE) AS first_mastered,
       EXTRACT(DAY FROM MIN(qa.completed_at) - MIN(ss.session_date)::TIMESTAMPTZ)::INT
FROM lectures l
JOIN study_sessions ss ON ss.lecture_id = l.id AND ss.user_id = p_user_id
JOIN quiz_attempts qa ON qa.lecture_id = l.id AND qa.user_id = p_user_id AND qa.score >= 80
GROUP BY l.id, l.title
ORDER BY first_viewed;
$$;

-- 2. get_benchmark (No privacy limit for dev as requested)
CREATE OR REPLACE FUNCTION get_benchmark(p_user_id UUID, p_course_id UUID)
RETURNS TABLE(
  lecture_title TEXT,
  student_avg FLOAT,
  course_avg FLOAT,
  percentile FLOAT
)
LANGUAGE sql STABLE AS $$
SELECT
  l.title,
  AVG(qa.score) FILTER (WHERE qa.user_id = p_user_id) AS student_avg,
  AVG(qa.score) AS course_avg,
  PERCENT_RANK() OVER (
    PARTITION BY l.id
    ORDER BY AVG(qa.score) FILTER (WHERE qa.user_id = p_user_id)
  ) * 100 AS percentile
FROM lectures l
JOIN quiz_attempts qa ON qa.lecture_id = l.id
JOIN courses c ON c.id = l.course_id AND c.id = p_course_id
GROUP BY l.id, l.title
ORDER BY l.title;
$$;



-- Phase 11: Study Planning & Productivity
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('exam', 'assignment', 'session')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calendar events" ON calendar_events;
CREATE POLICY "Users can view their own calendar events" ON calendar_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar events" ON calendar_events;
CREATE POLICY "Users can insert their own calendar events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calendar events" ON calendar_events;
CREATE POLICY "Users can delete their own calendar events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);



-- Phase 12: Community & Social
CREATE TABLE IF NOT EXISTS study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_group_members (
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view groups they are in" ON study_groups;
CREATE POLICY "Users can view groups they are in" ON study_groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_groups.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create groups" ON study_groups;
CREATE POLICY "Users can create groups" ON study_groups FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Group admins can delete groups" ON study_groups;
CREATE POLICY "Group admins can delete groups" ON study_groups FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can view other members" ON study_group_members;
CREATE POLICY "Members can view other members" ON study_group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM study_group_members sm WHERE sm.group_id = study_group_members.group_id AND sm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
CREATE POLICY "Users can join groups" ON study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM study_group_members sm WHERE sm.group_id = group_id AND sm.user_id = auth.uid() AND sm.role = 'admin'));

DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
CREATE POLICY "Users can leave groups" ON study_group_members FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM study_group_members sm WHERE sm.group_id = group_id AND sm.user_id = auth.uid() AND sm.role = 'admin'));

