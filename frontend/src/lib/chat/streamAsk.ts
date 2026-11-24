export class StreamAskError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'StreamAskError';
    this.status = status;
    this.code = code;
  }
}

export interface AskFinalPayload {
  result?: { choices?: Array<{ message?: { content?: string } }> };
  grounding?: unknown;
  followups?: string[];
  sources?: Array<{ title: string; uri: string }>;
  memorySaved?: string[];
  provider?: string;
  modelUsed?: string;
  remainingCredits?: number;
  freePasses?: number;
  paidCredits?: number;
  secondsUntilRefill?: number;
  deductedFrom?: string;
}

interface StreamHandlers {
  signal?: AbortSignal;
  onDelta?: (chunk: string) => void;
  onReset?: () => void;
}

export async function streamAsk(
  body: unknown,
  { signal, onDelta, onReset }: StreamHandlers = {}
): Promise<AskFinalPayload> {
  const res = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok || !contentType.includes('text/event-stream')) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (res.ok) return errJson as AskFinalPayload;
    throw new StreamAskError(
      errJson.error || `Server responded with status ${res.status}`,
      res.status,
      errJson.code
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new StreamAskError('Streaming is not supported in this browser', 500);

  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: AskFinalPayload | null = null;

  const handleBlock = (block: string) => {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let data: any;
    try {
      data = JSON.parse(dataLines.join('\n'));
    } catch {
      return;
    }
    if (event === 'delta' && typeof data.t === 'string') onDelta?.(data.t);
    else if (event === 'reset') onReset?.();
    else if (event === 'final') finalPayload = data as AskFinalPayload;
    else if (event === 'error') {
      throw new StreamAskError(data.error || 'AI request failed', 502, data.code);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      handleBlock(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  if (buffer.trim()) handleBlock(buffer);

  if (!finalPayload) throw new StreamAskError('The response ended unexpectedly. Please retry.', 502);
  return finalPayload;
}

export function stripProtocolTags(text: string): string {
  return text
    .replace(/<followups>[\s\S]*?<\/followups>/gi, '')
    .replace(/<memory>[\s\S]*?<\/memory>/gi, '')
    .replace(/<(followups|memory)>[\s\S]*$/i, '')
    .replace(/<\/?(followups|memory)>/gi, '')
    .trimEnd();
}
