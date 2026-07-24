ALTER TABLE public.ai_api_keys ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0;

-- Enable REPLICA IDENTITY FULL so updates broadcast the entire row via Realtime
ALTER TABLE public.ai_api_keys REPLICA IDENTITY FULL;

-- Ensure the table is in the Supabase Realtime publication
BEGIN;
  -- Remove it first just in case to avoid duplicates
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.ai_api_keys;
  -- Add it to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_api_keys;
COMMIT;
