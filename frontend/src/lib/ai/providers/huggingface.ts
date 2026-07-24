import { HfInference } from '@huggingface/inference'
import { setCache } from '../cache'

export function getHfClient() {
  if (!process.env.HUGGINGFACE_API_KEY) throw new Error("HUGGINGFACE_API_KEY is not set")
  return new HfInference(process.env.HUGGINGFACE_API_KEY)
}

export async function generateEmbeddings(texts: string[], documentId?: string) {
  const hf = getHfClient()
  
  // Example usage for text embeddings
  const result = await hf.featureExtraction({
    model: 'BAAI/bge-small-en-v1.5',
    inputs: texts,
  })
  
  if (documentId) {
    // Assuming result is an array of vectors
    setCache('embedding' as any, result, documentId).catch(console.error)
  }
  
  return result
}
