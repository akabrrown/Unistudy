import dotenv from 'dotenv';
dotenv.config(); // from root
import Groq from 'groq-sdk';

async function testGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('no key');
  
  const groq = new Groq({ apiKey: key });
  const prompt = `
      Generate a set of high-quality, comprehensive flashcards from the provided lecture text.
      Return ONLY a JSON array of objects with the structure:
      [ { "front": "question or concept", "back": "answer or explanation" } ]

      Lecture material:
      Newton's second law is F = ma. The capital of France is Paris.
    `;
      
  try {
    const result = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    
    console.log("GROQ TEXT:", result.choices[0]?.message?.content);
  } catch (e: any) {
    console.error("ERROR:", e.message);
  }
}

testGroq();
