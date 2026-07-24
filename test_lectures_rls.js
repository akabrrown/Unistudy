require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // using ANON KEY to test RLS
);

async function main() {
  const { data: lectures, error } = await supabase
    .from('lectures')
    .select('*')
    .limit(5);
    
  console.log("Lectures (ANON):", lectures);
  console.log("Error:", error);
}
main();
