CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- e.g., 'gemini', 'grok', 'openai'
  key_value TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'rate_limited')),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secure the table: Only users with the 'admin' role can manage these keys
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API keys" ON public.ai_api_keys
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  );

CREATE POLICY "Admins can insert API keys" ON public.ai_api_keys
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  );

CREATE POLICY "Admins can update API keys" ON public.ai_api_keys
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  );

CREATE POLICY "Admins can delete API keys" ON public.ai_api_keys
  FOR DELETE USING (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  );
