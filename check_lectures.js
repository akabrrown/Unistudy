require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);
    
  console.log("Profiles:", profiles);
  console.log("Error:", error);
}
main();
