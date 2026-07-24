import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const toInsert = [{
    lecture_id: "00000000-0000-0000-0000-000000000001", // Default fake lecture
    question: "Test question",
    options: [],
    correct_option: "Test",
    explanation: "Test exp",
    difficulty: 3,
    type: "fill_in"
  }];
  
  const { error } = await supabase.from('quiz_questions').insert(toInsert);
  console.log('Insert Error:', error);
}

run();
