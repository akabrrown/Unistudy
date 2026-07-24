-- Migration: 20240715_study_material_sharing

CREATE TABLE shared_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'lecture', 'notes', 'flashcard_deck', 'quiz', 'cheat_sheet', 'summary', 'video_list'
  content_id UUID NOT NULL,       -- FK to the specific table
  title TEXT NOT NULL,
  description TEXT,
  share_scope TEXT NOT NULL,      -- 'private', 'friends', 'group', 'institution', 'public'
  permission TEXT DEFAULT 'view', -- 'view' | 'download'
  institution_id UUID REFERENCES institutions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE material_access (
  share_id UUID REFERENCES shared_materials(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id),
  group_id UUID REFERENCES study_groups(id),
  accessed_at TIMESTAMPTZ,
  saved BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (share_id, recipient_id)
);

-- Enable RLS
ALTER TABLE shared_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_access ENABLE ROW LEVEL SECURITY;

-- Policies for shared_materials
CREATE POLICY "Users can read their own shared materials"
ON shared_materials FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own shared materials"
ON shared_materials FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own shared materials"
ON shared_materials FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own shared materials"
ON shared_materials FOR DELETE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can read public shared materials"
ON shared_materials FOR SELECT
USING (share_scope = 'public');

CREATE POLICY "Users can read institution shared materials"
ON shared_materials FOR SELECT
USING (
  share_scope = 'institution' 
  AND institution_id IN (
    SELECT institution_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can read friends/group shared materials if they have access"
ON shared_materials FOR SELECT
USING (
  (share_scope = 'friends' OR share_scope = 'group')
  AND EXISTS (
    SELECT 1 FROM material_access 
    WHERE share_id = shared_materials.id 
    AND recipient_id = auth.uid()
  )
);

-- Policies for material_access
CREATE POLICY "Users can read material access if they are the recipient or owner"
ON material_access FOR SELECT
USING (
  recipient_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM shared_materials 
    WHERE id = material_access.share_id 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own material access"
ON material_access FOR UPDATE
USING (recipient_id = auth.uid());

CREATE POLICY "Owners can insert material access"
ON material_access FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shared_materials 
    WHERE id = material_access.share_id 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert material access if they are the recipient (saving)"
ON material_access FOR INSERT
WITH CHECK (recipient_id = auth.uid());
