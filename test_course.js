require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // using ANON KEY
);

async function main() {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*, lectures(id, title, file_url)')
    .eq('id', '0bea4db7-9d11-419a-b6eb-35b252c12253')
    .single();
    
  console.log("Course:", JSON.stringify(course, null, 2));
  console.log("Error:", error);
}
main();
