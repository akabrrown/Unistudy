import { apiFetchRaw } from '@/lib/api/client';
import { sanitizeMathResponse } from '../../../shared/lib/mathSanitizer';

export interface SolveMathStreamParams {
  problem: string;
  subject: string;
  level: string;
  imageBase64?: string | null;
  mimeType?: string;
  onChunk: (fullText: string) => void;
  onExtractedText?: (extractedText: string) => void;
}

export async function extractMathFromImage(params: {
  imageBase64: string;
  mimeType?: string;
  mode?: 'math' | 'graph';
}): Promise<string> {
  const { imageBase64, mimeType = 'image/jpeg', mode = 'math' } = params;

  // 1. Primary: Next.js /api/ai/ocr-math
  let lastError = 'Could not extract mathematical text from image.';
  try {
    const res = await fetch('/api/ai/ocr-math', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, mode }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      extractedText?: string;
      error?: string;
    };
    if (res.ok && data?.extractedText?.trim()) {
      return data.extractedText.trim();
    }
    if (data?.error) {
      lastError = data.error;
    }
  } catch {
    // Fall through to Express backend /ai/ocr-math
  }

  // 2. Fallback: Express backend /ai/ocr-math
  try {
    const backendRes = await apiFetchRaw('/ai/ocr-math', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType, mode }),
    });
    const data = (await backendRes.json().catch(() => ({}))) as {
      extractedText?: string;
      error?: string;
    };
    if (backendRes.ok && data?.extractedText?.trim()) {
      return data.extractedText.trim();
    }
    if (data?.error) {
      lastError = data.error;
    }
  } catch {
    // Both routes unreachable
  }

  throw new Error(lastError);
}

async function consumeMathSse(
  res: Response,
  onChunk: (fullText: string) => void,
  onExtractedText?: (extractedText: string) => void
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('No readable response stream');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let hasFinalOverride = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payloadStr = trimmed.slice(6);
      if (payloadStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payloadStr) as unknown;
        if (typeof parsed === 'string') {
          accumulated += parsed;
          onChunk(accumulated);
        } else if (parsed && typeof parsed === 'object') {
          const rec = parsed as {
            text?: unknown;
            finalText?: unknown;
            extractedText?: unknown;
            error?: unknown;
          };
          if (typeof rec.error === 'string' && rec.error) {
            throw new Error(rec.error);
          }
          if (typeof rec.extractedText === 'string' && rec.extractedText.trim()) {
            onExtractedText?.(rec.extractedText.trim());
          }
          if (typeof rec.finalText === 'string' && rec.finalText) {
            accumulated = rec.finalText;
            hasFinalOverride = true;
            onChunk(accumulated);
          } else if (typeof rec.text === 'string' && rec.text) {
            accumulated += rec.text;
            onChunk(accumulated);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message && !err.message.includes('JSON')) {
          throw err;
        }
      }
    }
  }

  const finalCleaned = hasFinalOverride
    ? accumulated
    : sanitizeMathResponse(accumulated);

  if (finalCleaned !== accumulated) {
    onChunk(finalCleaned);
  }
  return finalCleaned;
}

export async function solveMathProblemStream(params: SolveMathStreamParams): Promise<string> {
  const { problem, subject, level, imageBase64, mimeType, onChunk, onExtractedText } = params;

  // Use Next.js /api/calculator directly when an image is attached, or fall back to it from Express
  if (!imageBase64) {
    try {
      const backendRes = await apiFetchRaw('/ai/calculator', {
        method: 'POST',
        body: JSON.stringify({ problem, subject, level }),
      });
      if (backendRes.ok) {
        const text = await consumeMathSse(backendRes, onChunk, onExtractedText);
        if (text.trim()) return text;
      }
    } catch {
      // Fallback transparently to Next.js /api/calculator
    }
  }

  const localRes = await fetch('/api/calculator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problem: problem.trim() || undefined,
      subject,
      level,
      imageBase64: imageBase64 || undefined,
      mimeType: imageBase64 ? mimeType : undefined,
    }),
  });

  if (!localRes.ok) {
    const errPayload = await localRes.json().catch(() => ({}));
    throw new Error(
      (errPayload as { error?: string; message?: string })?.error ||
        (errPayload as { message?: string })?.message ||
        'Failed to solve mathematical problem'
    );
  }

  return consumeMathSse(localRes, onChunk, onExtractedText);
}

