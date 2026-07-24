-- Fix RLS for institutions table
-- This allows anyone to read the institutions (needed for the signup dropdown)

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to institutions" ON public.institutions;

CREATE POLICY "Allow public read access to institutions" 
ON public.institutions 
FOR SELECT 
USING (true);
