import Groq from 'groq-sdk';
import { GROQ_FAST_MODELS } from '../../../../shared/constants/aiModels';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'test-key',
});

export async function groqChat(prompt: string) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: GROQ_FAST_MODELS[0],
    });
    return chatCompletion.choices[0]?.message?.content || '';
  } catch (err) {
    console.error('Groq error:', err);
    return 'Could not generate insight at this time.';
  }
}

