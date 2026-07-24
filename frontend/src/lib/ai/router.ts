import { consumeUserQuota } from './quota'
import { isCached } from './cache'
import { Feature, FEATURE_PROVIDER_MAP } from '../../../../shared/constants/quota'

export type TaskType = 'vision' | 'batch_text' | 'streaming' | 'embedding' | 'rerank' | 'low_priority'

export type AIRequest = {
  task: TaskType
  feature: Feature
  payload: {
    imageBase64?: string
    imageBase64Array?: string[]
    prompt?: string
    texts?: string[]
    documents?: string[]
    query?: string
    systemPrompt?: string
    stream?: boolean
  }
  userId: string
  plan: string
  priority: 'high' | 'medium' | 'low'
  identifiers?: string[]
}

export type AIResponse = {
  result: any
  provider: string
  cached: boolean
  requestsConsumed: number
  tokensUsed?: number
  responseMs: number
}

// NOTE: This central router now delegates dynamically
export async function routeRequest(request: AIRequest): Promise<AIResponse> {
  const start = Date.now()
  
  if (request.identifiers && request.identifiers.length > 0) {
    const cached = await isCached(request.feature, ...request.identifiers);
    if (cached) {
       return {
         result: "CACHED_DATA",
         provider: 'cache',
         cached: true,
         requestsConsumed: 0,
         responseMs: Date.now() - start
       }
    }
  }

  // Find the exact provider mapping
  let provider = FEATURE_PROVIDER_MAP[request.feature] || 'gemini';
  let result = null;

  try {
    // Basic Mock execution based on mapped provider
    // Real implementation would dynamically import the specific provider file and execute
    switch (provider) {
      case 'gemini':
        result = "MOCK_GEMINI_RESULT"
        break
      case 'groq_70b':
      case 'groq_8b':
        result = "MOCK_GROQ_RESULT"
        break
      case 'huggingface':
        result = "MOCK_HF_RESULT"
        break
      case 'mistral':
        result = "MOCK_MISTRAL_RESULT"
        break
      case 'cohere':
        result = "MOCK_COHERE_RESULT"
        break
      case 'youtube':
        result = "MOCK_YOUTUBE_RESULT"
        break
      case 'cloudflare':
        result = "MOCK_CF_RESULT"
        break
      case 'openrouter':
        result = "MOCK_OR_RESULT"
        break
      default:
        result = "MOCK_FALLBACK_RESULT"
    }

  } catch (error) {
    console.error(`Provider ${provider} failed, falling back to openrouter.`, error)
    provider = 'openrouter'
    result = "MOCK_OPENROUTER_FALLBACK_RESULT"
  }

  return {
    result,
    provider,
    cached: false,
    requestsConsumed: 1, // Let consumeUserQuota apply the correct feature multiplier
    responseMs: Date.now() - start
  }
}
