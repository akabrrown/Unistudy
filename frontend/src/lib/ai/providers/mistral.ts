// @ts-nocheck
import { MistralClient } from '@mistralai/mistralai'

export function getMistralClient() {
  if (!process.env.MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY is not set")
  return new MistralClient(process.env.MISTRAL_API_KEY)
}

export async function mistralFallbackText(prompt: string) {
  const client = getMistralClient()
  
  const chatResponse = await client.chat({
    model: 'mistral-small',
    messages: [{role: 'user', content: prompt}],
  })
  
  return chatResponse.choices[0].message.content
}
