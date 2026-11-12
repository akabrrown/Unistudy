import Groq from 'groq-sdk';
import {
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../shared/constants/aiModels';

const CANDIDATE_MODELS = [...GROQ_SMART_MODELS];

export async function chatCompletionWithFallback(options: {
  messages: any[];
  response_format?: { type: 'json_object' };
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  let lastError: any = null;

  if (apiKey) {
    const groq = new Groq({ apiKey });
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
  }

  // Fallback to OpenRouter candidate models
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    for (const model of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: options.messages,
            response_format: options.response_format,
            ...(options.max_tokens ? { max_tokens: options.max_tokens } : {})
          })
        });
        if (orRes.ok) {
          const orData = await orRes.json();
          const content = orData.choices?.[0]?.message?.content;
          if (content) return content;
        }
      } catch (orErr: any) {
        lastError = orErr;
        console.error(`OpenRouter fallback (${model}) failed:`, orErr.message);
      }
    }
  }

  throw lastError || new Error("Failed to complete request with all available models");
}
