import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('no key');
  
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `
        Generate a set of high-quality, comprehensive flashcards from the provided lecture text and explanations.
        The flashcards should cover key concepts, definitions, and important facts.
        Return ONLY a JSON array of objects with the structure:
        { "front": "question or concept", "back": "answer or explanation" }

        Content to process:
        This is a test lecture. The capital of France is Paris. Newton's second law is F = ma.
      `;
      
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    const text = result.response.text();
    console.log("RAW TEXT:", text);
    
    const parsed = JSON.parse(text);
    console.log("PARSED TYPE:", typeof parsed);
    console.log("IS ARRAY:", Array.isArray(parsed));
    console.log("PARSED CONTENT:", JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.error("ERROR:", e);
  }
}

testGemini();
