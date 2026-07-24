import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    const res = await fetch(`http://localhost:8000/api/quizzes/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Need a valid token here, I will just use a fake one and it might fail auth.
      },
      body: JSON.stringify({ lectureId: "00000000-0000-0000-0000-000000000001", questionCount: 5 })
    });
    console.log(res.status, await res.text());
  } catch (err) {
    console.error(err);
  }
}

run();
