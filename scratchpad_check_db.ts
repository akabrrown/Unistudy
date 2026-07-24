import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) throw new Error("SUPABASE_URL is empty");

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('ai_request_log')
    .select('*')
    .eq('feature', 'flashcard_generation')
    .order('called_at', { ascending: false })
    .limit(3);
    
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

check();
