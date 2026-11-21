import { AIRequest } from '../router';
import { AGENTROUTER_CANDIDATE_MODELS } from '../../../../../shared/constants/aiModels';

export async function handleAgentRouterRequest(req: AIRequest) {
  const apiKey = process.env.AGENTROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('AGENTROUTER_API_KEY is not set');
  }

  const rawBaseUrl = process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.to/v1';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  const messages = req.payload.messages
    ? [
        { role: 'system', content: req.payload.systemPrompt || 'You are UniStudy academic assistant.' },
        ...req.payload.messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || ''),
        })),
      ]
    : [
        ...(req.payload.systemPrompt ? [{ role: 'system', content: req.payload.systemPrompt }] : []),
        { role: 'user', content: req.payload.prompt || 'Hello' },
      ];

  const temperature =
    req.feature === 'flashcard_generation'
      ? 0.2
      : (req.payload.temperature ?? 0.55);

  const candidateModels = req.model_tier === 'smart'
    ? ['claude-3-5-sonnet', 'deepseek-r1', 'gpt-4o', ...AGENTROUTER_CANDIDATE_MODELS]
    : ['gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct', ...AGENTROUTER_CANDIDATE_MODELS];

  const uniqueModels = Array.from(new Set(candidateModels));
  let lastError = 'All AgentRouter candidate models failed';

  for (const model of uniqueModels) {
    try {
      const endpoint = baseUrl.endsWith('/v1')
        ? `${baseUrl}/chat/completions`
        : `${baseUrl}/v1/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        lastError = result?.error?.message || result?.msg || `AgentRouter HTTP ${response.status}`;
        continue;
      }

      const content = result.choices?.[0]?.message?.content;
      if (content) {
        return content;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(`[AgentRouter] ${lastError}`);
}
