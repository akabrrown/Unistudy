import { AIRequest } from '../router'

export async function handleOpenRouterRequest(req: AIRequest) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set")
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-flash-1.5",
      messages: req.payload.messages 
        ? [
            { role: "system", content: req.payload.systemPrompt || "You are a helpful assistant." },
            ...req.payload.messages
          ]
        : [
            { role: "user", content: req.payload.prompt || "Hello" }
          ]
    })
  });
  
  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}
