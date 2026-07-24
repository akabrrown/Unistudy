UPDATE courses SET title = 'Unknown Course' WHERE title IS NULL OR trim(title) = '';
ALTER TABLE courses ALTER COLUMN title SET NOT NULL;
