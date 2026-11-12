import { AIRequest } from '../router'
import { OPENROUTER_CANDIDATE_MODELS } from '../../../../../shared/constants/aiModels'

export async function handleOpenRouterRequest(req: AIRequest) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set")

  const messages = req.payload.messages
    ? [
        { role: "system", content: req.payload.systemPrompt || "You are a helpful assistant." },
        ...req.payload.messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '')
        }))
      ]
    : [
        { role: "user", content: req.payload.prompt || "Hello" }
      ];

  let lastError = 'All OpenRouter candidate models failed';
  for (const model of OPENROUTER_CANDIDATE_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, messages })
      });

      const result = await response.json();
      if (!response.ok) {
        lastError = result?.error?.message || `OpenRouter HTTP ${response.status}`;
        continue;
      }

      const content = result.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastError);
}
