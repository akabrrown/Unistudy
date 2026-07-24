-- Drop the existing foreign key constraint if it exists
ALTER TABLE quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_lecture_id_fkey;

-- Add the new foreign key constraint with ON DELETE CASCADE
ALTER TABLE quiz_attempts
  ADD CONSTRAINT quiz_attempts_lecture_id_fkey 
  FOREIGN KEY (lecture_id) 
  REFERENCES lectures(id) 
  ON DELETE CASCADE;
