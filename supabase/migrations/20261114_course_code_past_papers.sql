-- Migration: 20261114_course_code_past_papers.sql
-- Decouples past papers from individual student courses, links to normalized course codes,
-- associates with institutions, and backfills existing records.

-- 1. Add course_code, normalized_course_code, and institution_id to past_papers
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS course_code TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS normalized_course_code TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

-- 2. Make course_id nullable with ON DELETE SET NULL so deleting a private course doesn't destroy community papers
ALTER TABLE past_papers ALTER COLUMN course_id DROP NOT NULL;

DO $$ BEGIN
    ALTER TABLE past_papers DROP CONSTRAINT IF EXISTS past_papers_course_id_fkey;
    ALTER TABLE past_papers ADD CONSTRAINT past_papers_course_id_fkey 
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 3. Create high-performance query indexes
CREATE INDEX IF NOT EXISTS idx_past_papers_normalized_code ON past_papers(normalized_course_code);
CREATE INDEX IF NOT EXISTS idx_past_papers_institution ON past_papers(institution_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_norm_inst ON past_papers(normalized_course_code, institution_id);

-- 4. Backfill existing records: Populate course_code & normalized_course_code from existing courses
UPDATE past_papers pp
SET 
    course_code = c.course_code,
    normalized_course_code = UPPER(REGEXP_REPLACE(c.course_code, '[^a-zA-Z0-9]', '', 'g')),
    institution_id = COALESCE(pp.institution_id, p.institution_id)
FROM courses c
LEFT JOIN profiles p ON c.user_id = p.id
WHERE pp.course_id = c.id
  AND (pp.course_code IS NULL OR pp.normalized_course_code IS NULL);

-- 5. Auto-tag with UPSA institution if user is enrolled in UPSA
UPDATE past_papers pp
SET institution_id = (SELECT id FROM institutions WHERE abbreviation = 'UPSA' OR name ILIKE '%Professional Studies%' LIMIT 1)
WHERE pp.institution_id IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = pp.user_id
      AND (pr.university ILIKE '%UPSA%' OR pr.university ILIKE '%Professional Studies%')
  );

-- 6. Update Row-Level Security policy for institutional access
DROP POLICY IF EXISTS "View past papers" ON past_papers;

CREATE POLICY "View past papers" ON past_papers
FOR SELECT USING (
    -- 1. Owner can always view their uploaded papers
    user_id = auth.uid() 
    OR (
        -- 2. Students at the same institution can view institutional papers
        institution_id IS NOT NULL 
        AND institution_id = (
            SELECT institution_id FROM profiles WHERE id = auth.uid()
        )
    )
    OR (
        -- 3. Papers explicitly shared to community with matching institution or general public
        shared_to_community = true 
        AND (
            institution_id IS NULL 
            OR institution_id = (
                SELECT institution_id FROM profiles WHERE id = auth.uid()
            )
        )
    )
);

