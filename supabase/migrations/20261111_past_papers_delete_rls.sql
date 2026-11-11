-- 2026-11-11: Enable DELETE and UPDATE on past_papers and related child tables
-- Ensures users and admins can delete past questions and cascading resources

DO $$ BEGIN
    DROP POLICY IF EXISTS "Delete own past papers" ON past_papers;
    DROP POLICY IF EXISTS "Update own past papers" ON past_papers;
    DROP POLICY IF EXISTS "Delete own past paper questions" ON past_paper_questions;
    DROP POLICY IF EXISTS "Delete own past paper pages" ON past_paper_pages;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Past papers DELETE policy
CREATE POLICY "Delete own past papers" ON past_papers
FOR DELETE USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Past papers UPDATE policy
CREATE POLICY "Update own past papers" ON past_papers
FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Past paper questions DELETE policy
CREATE POLICY "Delete own past paper questions" ON past_paper_questions
FOR DELETE USING (
    past_paper_id IN (
        SELECT id FROM past_papers 
        WHERE user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
);

-- Past paper pages DELETE policy
CREATE POLICY "Delete own past paper pages" ON past_paper_pages
FOR DELETE USING (
    past_paper_id IN (
        SELECT id FROM past_papers 
        WHERE user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
);

