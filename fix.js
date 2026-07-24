const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'frontend/.env.local' });
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: papers } = await supabase.from('past_papers').select('*');
  if (papers) {
    for (const p of papers) {
      if (p.course_id && p.user_id) {
        await supabase.from('courses').update({ user_id: p.user_id }).eq('id', p.course_id);
      }
    }
    console.log('Fixed!');
  }
}
run();
