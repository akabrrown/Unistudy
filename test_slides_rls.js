require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // using ANON KEY to test RLS
);

async function main() {
  const { data: slides, error } = await supabase
    .from('slides')
    .select('*')
    .eq('lecture_id', '40fdba52-0fe8-479a-89f4-5a78114d866f');
    
  console.log("Slides (ANON):", slides);
  console.log("Error:", error);
}
main();
