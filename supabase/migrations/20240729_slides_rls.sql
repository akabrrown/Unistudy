-- Allow public read access to slides
CREATE POLICY "Allow public read access to slides" 
    ON public.slides FOR SELECT 
    USING (true);
