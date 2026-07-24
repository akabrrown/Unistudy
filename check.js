const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'frontend/.env.local' });
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('past_papers').select('*, courses(*)');
  console.log(JSON.stringify(data, null, 2));
  console.log('Error:', error);
}
run();
