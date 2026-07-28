-- The profiles table's own FK to auth.users is missing ON DELETE CASCADE.
-- This is the actual blocker: Supabase can't remove auth.users rows
-- because profiles.id still references them.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
