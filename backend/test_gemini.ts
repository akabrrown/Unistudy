import { handleGeminiRequest } from './src/lib/ai/providers/gemini';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    const aiReq: any = {
      feature: 'quiz_generation',
      payload: { 
        questionCount: 3, 
        difficulty: 'medium',
        imageBase64Array: []
      }
    };
    const res = await handleGeminiRequest(aiReq);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
