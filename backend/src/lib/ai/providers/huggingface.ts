import { AIRequest } from '../router'
import { HfInference } from '@huggingface/inference'

export function getHfClient() {
  const token = process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_KEY;
  if (!token) throw new Error("HUGGINGFACE_API_TOKEN or HUGGINGFACE_API_KEY is not set")
  return new HfInference(token)
}

export async function handleHFRequest(req: AIRequest) {
  const hf = getHfClient()
  
  if (req.feature.includes('embedding')) {
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: req.payload.texts || [req.payload.prompt || '']
    })
    return result
  }

  throw new Error(`HuggingFace does not support feature: ${req.feature}`)
}
