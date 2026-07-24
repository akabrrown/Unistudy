-- Migration: Admin Dashboard Tables (A01-A10)
-- Description: Adds platform_settings, admin_audit_logs, announcements, content_flags, slide_confidence, and updates profiles.

-- 1. Update Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspend_reason TEXT;

-- 2. Platform Settings (Add new columns to existing table)
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS free_course_limit INT NOT NULL DEFAULT 3;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS free_lecture_limit INT NOT NULL DEFAULT 5;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS free_trial_days INT NOT NULL DEFAULT 7;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS community_bank_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS study_groups_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS partner_matcher_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS max_upload_size_mb INT NOT NULL DEFAULT 50;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS audio_rooms_enabled BOOLEAN NOT NULL DEFAULT true;

-- 3. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_type VARCHAR(255) NOT NULL,
    target_id UUID,
    target_type VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure INSERT-only by NOT creating update/delete policies
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can insert audit logs" ON admin_audit_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 4. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'free', 'paid'
    type VARCHAR(50) DEFAULT 'banner', -- 'banner', 'email'
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 5. Content Flags
CREATE TABLE IF NOT EXISTS content_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'lecture', 'past_paper'
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert flags" ON content_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage flags" ON content_flags FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 6. Slide Confidence (For Confusion Analytics)
CREATE TABLE IF NOT EXISTS slide_confidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upsert rule for confidence: a user can only have one confidence rating per slide
ALTER TABLE slide_confidence ADD CONSTRAINT unique_user_slide_confidence UNIQUE (user_id, slide_id);

ALTER TABLE slide_confidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert/update their own confidence" ON slide_confidence FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all confidence ratings" ON slide_confidence FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
