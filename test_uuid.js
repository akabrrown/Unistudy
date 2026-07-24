require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // use service role to avoid RLS hiding errors
);

async function main() {
  console.log("Fetching lecture with ID '1'...");
  const { data: lecture, error: lecError } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', '1')
    .single();
    
  console.log("Lecture Data:", lecture);
  console.log("Lecture Error:", lecError);

  console.log("Fetching slides with lecture_id '1'...");
  const { data: slides, error: slideError } = await supabase
    .from('slides')
    .select('*')
    .eq('lecture_id', '1');
    
  console.log("Slides Data:", slides);
  console.log("Slide Error:", slideError);
}
main();
