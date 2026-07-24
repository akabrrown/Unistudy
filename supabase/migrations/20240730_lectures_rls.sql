-- Allow public read access to lectures
CREATE POLICY "Allow public read access to lectures" 
    ON public.lectures FOR SELECT 
    USING (true);
