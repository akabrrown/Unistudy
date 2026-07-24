import { AIRequest } from '../router'
import { Mistral } from '@mistralai/mistralai'

export function getMistralClient() {
  if (!process.env.MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY is not set")
  return new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
}

export async function handleMistralRequest(req: AIRequest) {
  const mistral = getMistralClient()
  
  const result = await mistral.chat.complete({
    model: 'mistral-large-latest',
    messages: [{ role: 'user', content: req.payload.prompt || 'Hello' }]
  })
  
  return result.choices?.[0]?.message?.content || ''
}
