import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: lectures } = await supabase.from('lectures').select('id').limit(1);
  if (!lectures || lectures.length === 0) {
    console.log("No lectures in DB!");
    return;
  }
  
  const realLectureId = lectures[0].id;
  
  const toInsert = [{
    lecture_id: realLectureId,
    question: "Test question",
    options: [],
    correct_option: "Test",
    explanation: "Test exp",
    difficulty: 3,
    type: "fill_in"
  }];
  
  const { error } = await supabase.from('quiz_questions').insert(toInsert);
  console.log('Insert Error on REAL lecture:', error);
}

run();
