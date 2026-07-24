import { AIRequest } from '../router'
import { CohereClient } from 'cohere-ai'

export function getCohereClient() {
  if (!process.env.COHERE_API_KEY) throw new Error("COHERE_API_KEY is not set")
  return new CohereClient({ token: process.env.COHERE_API_KEY })
}

export async function handleCohereRequest(req: AIRequest) {
  const cohere = getCohereClient()
  
  if (req.feature === 'semantic_search_rerank') {
    const result = await cohere.rerank({
      model: 'rerank-english-v3.0',
      query: req.payload.query || '',
      documents: req.payload.documents || [],
      topN: 5
    })
    return result.results
  }

  throw new Error(`Cohere does not support feature: ${req.feature}`)
}
