const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
  // Try to create a policy to allow read access to everyone
  const { error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Allow public read access to institutions" ON public.institutions; CREATE POLICY "Allow public read access to institutions" ON public.institutions FOR SELECT USING (true);' });
  
  if (error) {
    console.log("No RPC execute_sql available, let's try pushing via supabase CLI or we can just tell the user.");
  }
}

fixRLS();
