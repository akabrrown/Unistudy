-- Migration: Admin CMS & Unified System Control (20261122)
-- Description: Adds tables for public CMS (testimonials, FAQs, quotes, contact submissions),
-- RLS security policies, course merging RPC, and wallet adjustment RPC.

-- 1. Public Testimonials Table
CREATE TABLE IF NOT EXISTS public_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name VARCHAR(150) NOT NULL,
    student_role VARCHAR(150) DEFAULT 'UPSA Student',
    program VARCHAR(200),
    content TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    is_featured BOOLEAN NOT NULL DEFAULT true,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved testimonials" ON public_testimonials
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Admins have full control over testimonials" ON public_testimonials
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- 2. Public FAQs Table
CREATE TABLE IF NOT EXISTS public_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published FAQs" ON public_faqs
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins have full control over FAQs" ON public_faqs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- 3. Platform Quotes Table
CREATE TABLE IF NOT EXISTS platform_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote TEXT NOT NULL,
    author VARCHAR(150) NOT NULL DEFAULT 'Unknown',
    theme VARCHAR(100) DEFAULT 'Excellence',
    scheduled_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE platform_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active quotes" ON platform_quotes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins have full control over quotes" ON platform_quotes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- 4. Contact Submissions Table (Support Desk)
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'in_progress', 'resolved')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and visitors can submit contact forms" ON contact_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view and manage contact submissions" ON contact_submissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- 5. Course Merger Atomic Transaction RPC
CREATE OR REPLACE FUNCTION admin_merge_courses(source_course_id UUID, target_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    moved_lectures_count INT := 0;
    moved_papers_count INT := 0;
    source_code TEXT;
    target_code TEXT;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied: caller is not an administrator.';
    END IF;

    IF source_course_id = target_course_id THEN
        RAISE EXCEPTION 'Source and target courses must be distinct.';
    END IF;

    SELECT course_code INTO source_code FROM courses WHERE id = source_course_id;
    SELECT course_code INTO target_code FROM courses WHERE id = target_course_id;

    IF source_code IS NULL OR target_code IS NULL THEN
        RAISE EXCEPTION 'One or both courses not found.';
    END IF;

    -- Reassign lectures
    UPDATE lectures
    SET course_id = target_course_id
    WHERE course_id = source_course_id;
    GET DIAGNOSTICS moved_lectures_count = ROW_COUNT;

    -- Reassign past papers
    UPDATE past_papers
    SET course_id = target_course_id,
        course_code = target_code,
        normalized_course_code = UPPER(REGEXP_REPLACE(target_code, '[^A-Z0-9]', '', 'g'))
    WHERE course_id = source_course_id;
    GET DIAGNOSTICS moved_papers_count = ROW_COUNT;

    -- Archive source course
    UPDATE courses
    SET is_archived = true
    WHERE id = source_course_id;

    -- Log admin audit action
    INSERT INTO admin_audit_logs (admin_id, action_type, target_id, target_type, details)
    VALUES (
        auth.uid(),
        'COURSE_MERGE',
        target_course_id,
        'courses',
        jsonb_build_object(
            'source_course_id', source_course_id,
            'source_course_code', source_code,
            'target_course_id', target_course_id,
            'target_course_code', target_code,
            'moved_lectures', moved_lectures_count,
            'moved_papers', moved_papers_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'source_code', source_code,
        'target_code', target_code,
        'moved_lectures', moved_lectures_count,
        'moved_papers', moved_papers_count
    );
END;
$$;

-- 6. User Credit Adjust Atomic RPC
CREATE OR REPLACE FUNCTION admin_adjust_user_credits(target_user_id UUID, points_delta INT, reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INT := 0;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied: caller is not an administrator.';
    END IF;

    -- Ensure wallet exists
    INSERT INTO credit_wallets (user_id, balance, total_earned, updated_at)
    VALUES (target_user_id, GREATEST(0, points_delta), GREATEST(0, points_delta), NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = GREATEST(0, credit_wallets.balance + points_delta),
        total_earned = CASE WHEN points_delta > 0 THEN credit_wallets.total_earned + points_delta ELSE credit_wallets.total_earned END,
        updated_at = NOW()
    RETURNING balance INTO new_balance;

    -- Log admin audit action
    INSERT INTO admin_audit_logs (admin_id, action_type, target_id, target_type, details)
    VALUES (
        auth.uid(),
        'CREDIT_WALLET_ADJUST',
        target_user_id,
        'credit_wallets',
        jsonb_build_object(
            'points_delta', points_delta,
            'new_balance', new_balance,
            'reason', reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'new_balance', new_balance,
        'points_delta', points_delta
    );
END;
$$;

-- 7. Seed Initial Curated Content (if empty)
INSERT INTO public_testimonials (student_name, student_role, program, content, rating, is_featured, is_approved)
VALUES 
('Kofi Mensah', 'Final Year Student', 'BSc Information Technology Management', 'UniStudy turned my exam preparation around. Having past questions verbatim with the AI tutor explaining marking schemes helped me score an A in Systems Analysis.', 5, true, true),
('Ama Serwaa', 'Level 300 Scholar', 'BSc Accounting and Finance', 'The MixTeX OCR scanner extracts handwritten lecture notes perfectly. Generating custom quiz drills from my actual slides saves hours of study time.', 5, true, true),
('Ebenezer Boateng', 'Level 200 Representative', 'Department of Banking and Finance', 'Synchronizing directly with our course banks and taking real-time mock examinations with grading feedback gave our entire study group a major advantage.', 5, true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public_faqs (category, question, answer, display_order, is_published)
VALUES
('General', 'How does UniStudy work with official UPSA course materials?', 'UniStudy organizes past examination papers, lecture slides, and notes directly by faculty and course codes. The integrated AI Study Tutor uses retrieval-augmented grounding to answer questions using your exact course syllabi.', 1, true),
('Billing & Credits', 'How do AI Compute Credits and Free Daily Allowances work?', 'Every registered student receives 30 Free Daily Compute Points every midnight. For intensive exam preparation, additional credit bundles can be purchased securely through Mobile Money (MTN MoMo, Telecel Cash, AT) or Card via Paystack.', 2, true),
('Past Papers', 'Can I practice past exam questions under timed conditions?', 'Yes! UniStudy features interactive mock exams with simulated timers, verbatim questions, and an examiner report detailing your performance across all topics.', 3, true),
('Mobile & Offline', 'Can I access UniStudy on my mobile device?', 'Yes, UniStudy is fully responsive and installs as a progressive web application on both Android and iOS devices, with offline caching for downloaded lecture slides.', 4, true)
ON CONFLICT DO NOTHING;
