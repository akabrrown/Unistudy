import Groq from 'groq-sdk';

const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

export async function chatCompletionWithFallback(options: {
  messages: any[];
  response_format?: { type: 'json_object' };
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const groq = new Groq({ apiKey });

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await groq.chat.completions.create({
        ...options,
        model
      });
      const content = res.choices[0]?.message?.content;
      if (content) return content;
    } catch (err: any) {
      lastError = err;
      console.warn(`Groq model ${model} failed, attempting next candidate:`, err.message);
    }
  }

  // If all Groq candidate models fail, fallback to OpenRouter
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      console.log('All Groq candidate models failed, calling OpenRouter fallback...');
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: options.messages,
          response_format: options.response_format
        })
      });
      if (orRes.ok) {
        const orData = await orRes.json();
        const content = orData.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (orErr: any) {
      console.error('OpenRouter fallback also failed:', orErr.message);
    }
  }

  throw lastError || new Error("Failed to complete request with all available models");
}
