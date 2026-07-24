-- Study Groups
ALTER TABLE study_groups 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id),
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Group Members
CREATE TABLE IF NOT EXISTS study_group_members (
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- Helper function to break RLS recursion
CREATE OR REPLACE FUNCTION is_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM study_group_members 
        WHERE group_id = check_group_id 
        AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM study_group_members 
        WHERE group_id = check_group_id 
        AND user_id = auth.uid()
        AND role = 'admin'
    );
$$;

-- RLS Policies for study_groups
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public groups" ON study_groups;
CREATE POLICY "Anyone can view public groups" ON study_groups
    FOR SELECT USING (
        NOT is_private
        OR (institution_id IS NOT NULL AND institution_id IN (
            SELECT institution_id FROM profiles WHERE id = auth.uid()
        ))
        OR is_group_member(id)
    );

DROP POLICY IF EXISTS "Authenticated users can create groups" ON study_groups;
CREATE POLICY "Authenticated users can create groups" ON study_groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Group creators can update their groups" ON study_groups;
CREATE POLICY "Group creators can update their groups" ON study_groups
    FOR UPDATE USING (created_by = auth.uid() OR is_group_admin(id));

DROP POLICY IF EXISTS "Group creators can delete their groups" ON study_groups;
CREATE POLICY "Group creators can delete their groups" ON study_groups
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for study_group_members
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view other members" ON study_group_members;
CREATE POLICY "Members can view other members" ON study_group_members
    FOR SELECT USING (
        is_group_member(group_id)
        OR 
        EXISTS (
            SELECT 1 FROM study_groups 
            WHERE id = study_group_members.group_id 
            AND NOT is_private
        )
    );

DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
CREATE POLICY "Users can join groups" ON study_group_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM study_groups 
            WHERE id = study_group_members.group_id 
            AND (NOT is_private OR created_by = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Group admins can manage members" ON study_group_members;
CREATE POLICY "Group admins can manage members" ON study_group_members
    FOR ALL USING (
        is_group_admin(group_id)
        OR (
            -- Course creators can manage members of groups in their course
            EXISTS (
                SELECT 1 FROM courses c
                JOIN study_groups sg ON c.id = sg.course_id
                WHERE sg.id = study_group_members.group_id
                AND c.user_id = auth.uid()
            )
        )
    );

-- Allow users to leave groups
DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
CREATE POLICY "Users can leave groups" ON study_group_members
    FOR DELETE USING (user_id = auth.uid());
