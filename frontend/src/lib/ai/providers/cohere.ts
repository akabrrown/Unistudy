import { CohereClient } from 'cohere-ai'

export function getCohereClient() {
  if (!process.env.COHERE_API_KEY) throw new Error("COHERE_API_KEY is not set")
  return new CohereClient({
    token: process.env.COHERE_API_KEY,
  })
}

export async function rerankDocuments(query: string, documents: string[]) {
  const cohere = getCohereClient()
  
  const response = await cohere.v2.rerank({
    documents,
    query,
    model: 'rerank-english-v3.0',
    topN: 3
  })
  
  return response.results
}
