-- 20240802_add_unique_constraint_institution_student_counts.sql
-- Ensure institution_id has a unique constraint for ON CONFLICT upserts.

CREATE UNIQUE INDEX IF NOT EXISTS institution_student_counts_unique_idx ON institution_student_counts (institution_id);
