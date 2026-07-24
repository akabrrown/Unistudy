require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('lectures')
    .update({ title: 'Functions_and_Modular_Programming.pdf' })
    .eq('id', '40fdba52-0fe8-479a-89f4-5a78114d866f');
    
  console.log("Updated:", data);
  console.log("Error:", error);
}
main();
