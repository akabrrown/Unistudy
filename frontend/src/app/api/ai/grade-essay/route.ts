import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { highCostRatelimit } from '@/lib/ratelimit';
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import {
  buildEssayGraderPrompt,
  buildRubricGraderPrompt,
  buildPerfectEssayRewritePrompt,
  humanizeEssayText,
  humanizeStreamChunk,
  parseEssayReportJson,
  normalizeEssayReport,
  buildDeterministicEssayReport,
} from '../../../../../../shared/lib/essayGrader';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RequestSchema = z.object({
  prompt: z.string().trim().min(10, 'Prompt is too short (minimum 10 characters)').max(4000, 'Prompt is too long'),
  essay: z.string().trim().min(50, 'Essay is too short to grade (minimum 50 characters)').max(30000, 'Essay exceeds maximum length'),
  stream: z.boolean().optional(),
  mode: z.enum(['full', 'regenerate_essay']).optional(),
  weaknesses: z.array(z.string()).max(10).optional(),
  grammar: z.string().max(1500).optional(),
});

async function evaluateJsonWithProviders(
  promptText: string,
  maxTokens: number
): Promise<{ parsed: Record<string, unknown> | null; modelUsed: string | null }> {
  if (process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    for (const model of GROQ_SMART_MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: promptText }],
          model,
          response_format: { type: 'json_object' },
          max_tokens: maxTokens,
          temperature: 0.3,
        });
        const candidate = parseEssayReportJson(completion.choices[0]?.message?.content || '');
        if (candidate) return { parsed: candidate, modelUsed: model };
      } catch (err: unknown) {
        console.warn(`[EssayGrader] Groq (${model}) JSON pass failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            max_tokens: maxTokens,
            temperature: 0.3,
          }),
        });
        if (orRes.ok) {
          const orData = await orRes.json();
          const candidate = parseEssayReportJson(orData.choices?.[0]?.message?.content || '');
          if (candidate) return { parsed: candidate, modelUsed: model };
        }
      } catch (err: unknown) {
        console.warn(`[EssayGrader] OpenRouter (${model}) JSON pass failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    for (const modelName of GEMINI_CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: maxTokens,
          },
        });
        const result = await model.generateContent(promptText);
        const candidate = parseEssayReportJson(result.response.text());
        if (candidate) return { parsed: candidate, modelUsed: modelName };
      } catch (err: unknown) {
        console.warn(`[EssayGrader] Gemini (${modelName}) JSON pass failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  return { parsed: null, modelUsed: null };
}

async function streamTextWithProviders(
  promptText: string,
  onDelta: (chunk: string) => void
): Promise<string | null> {
  // 1. Groq native SSE streaming
  if (process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    for (const model of GROQ_SMART_MODELS) {
      try {
        const stream = await groq.chat.completions.create({
          messages: [{ role: 'user', content: promptText }],
          model,
          stream: true,
          max_tokens: 3000,
          temperature: 0.5,
        });
        let full = '';
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        }
        if (full.trim().length >= 120) return full.trim();
      } catch (err: unknown) {
        console.warn(`[EssayGrader] Groq stream (${model}) failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // 2. OpenRouter SSE streaming
  if (process.env.OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            stream: true,
            max_tokens: 3000,
            temperature: 0.5,
          }),
        });
        if (orRes.ok && orRes.body) {
          const reader = orRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let full = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  full += delta;
                  onDelta(delta);
                }
              } catch {
                // ignore partial SSE line
              }
            }
          }
          if (full.trim().length >= 120) return full.trim();
        }
      } catch (err: unknown) {
        console.warn(`[EssayGrader] OpenRouter stream (${model}) failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // 3. Gemini streaming fallback
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    for (const modelName of GEMINI_CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 3000 },
        });
        const result = await model.generateContentStream(promptText);
        let full = '';
        for await (const chunk of result.stream) {
          const delta = chunk.text();
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        }
        if (full.trim().length >= 120) return full.trim();
      } catch (err: unknown) {
        console.warn(`[EssayGrader] Gemini stream (${modelName}) failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authResult.user.id;

    try {
      const { success } = await highCostRatelimit.limit(userId);
      if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
      }
    } catch (rateLimitErr) {
      console.warn('Rate limiter warning (proceeding gracefully):', rateLimitErr);
    }

    if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Essay grader AI providers are not configured on the server.' },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsedInput = RequestSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        { error: parsedInput.error.issues[0]?.message || 'Invalid essay payload' },
        { status: 400 }
      );
    }
    const {
      prompt,
      essay,
      stream: wantStream,
      mode = 'full',
      weaknesses: requestedWeaknesses = [],
      grammar: requestedGrammar,
    } = parsedInput.data;

    // Real-time streaming mode for live rubric evaluation + live 100/100 essay generation
    if (wantStream || req.headers.get('accept')?.includes('text/event-stream')) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            if (mode === 'regenerate_essay') {
              sendEvent('status', {
                stage: 'writing_essay',
                message: 'Regenerating 100/100 essay from Areas for Improvement...',
              });

              const rewritePrompt = buildPerfectEssayRewritePrompt(
                prompt,
                essay,
                requestedWeaknesses,
                requestedGrammar
              );
              const streamedEssay = await streamTextWithProviders(rewritePrompt, (delta) => {
                sendEvent('essay_chunk', { delta: humanizeStreamChunk(delta) });
              });

              if (!streamedEssay) {
                sendEvent('error', { error: 'Could not regenerate essay right now. Please try again.' });
                controller.close();
                return;
              }

              sendEvent('done', {
                perfect_essay: humanizeEssayText(streamedEssay),
                isLiveAI: true,
              });
              controller.close();
              return;
            }

            sendEvent('status', {
              stage: 'evaluating',
              message: 'Evaluating thesis, evidence, structure, and academic tone...',
            });

            const rubricPrompt = buildRubricGraderPrompt(prompt, essay);
            const { parsed, modelUsed } = await evaluateJsonWithProviders(rubricPrompt, 1500);

            if (!parsed) {
              sendEvent('error', {
                error: 'Live AI grading models could not process this request right now. Please try again.',
              });
              controller.close();
              return;
            }

            const baseReport = normalizeEssayReport(parsed, prompt, essay);
            sendEvent('rubric', {
              report: { ...baseReport, perfect_essay: '' },
              modelUsed,
            });

            sendEvent('status', {
              stage: 'writing_essay',
              message: 'Applying Areas for Improvement to rewrite your 100/100 essay...',
            });

            const rewritePrompt = buildPerfectEssayRewritePrompt(
              prompt,
              essay,
              baseReport.weaknesses,
              baseReport.grammar
            );
            const streamedEssay = await streamTextWithProviders(rewritePrompt, (delta) => {
              sendEvent('essay_chunk', { delta: humanizeStreamChunk(delta) });
            });

            const finalReport = {
              ...baseReport,
              perfect_essay: streamedEssay ? humanizeEssayText(streamedEssay) : baseReport.perfect_essay,
            };

            sendEvent('done', {
              report: finalReport,
              isLiveAI: Boolean(streamedEssay),
              modelUsed,
            });
          } catch (streamErr: unknown) {
            const msg = streamErr instanceof Error ? streamErr.message : 'Realtime grading failed';
            sendEvent('error', { error: msg });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Standard JSON mode
    if (mode === 'regenerate_essay') {
      const rewritePrompt = buildPerfectEssayRewritePrompt(
        prompt,
        essay,
        requestedWeaknesses,
        requestedGrammar
      );
      const rewritten = await streamTextWithProviders(rewritePrompt, () => {});
      if (!rewritten) {
        return NextResponse.json({ error: 'Unable to regenerate 100/100 essay right now.' }, { status: 502 });
      }
      return NextResponse.json({ perfect_essay: humanizeEssayText(rewritten), isLiveAI: true });
    }

    const systemPrompt = buildEssayGraderPrompt(prompt, essay);
    const { parsed: parsedReport, modelUsed } = await evaluateJsonWithProviders(systemPrompt, 4096);

    if (parsedReport) {
      const existingPerfect =
        typeof parsedReport.perfect_essay === 'string' ? parsedReport.perfect_essay.trim() : '';
      if (existingPerfect.length < 120) {
        const rawWeaknesses = Array.isArray(parsedReport.weaknesses)
          ? parsedReport.weaknesses.map((w) => String(w))
          : [];
        const rawGrammar = typeof parsedReport.grammar === 'string' ? parsedReport.grammar : undefined;
        const rewritten = await streamTextWithProviders(
          buildPerfectEssayRewritePrompt(prompt, essay, rawWeaknesses, rawGrammar),
          () => {}
        );
        if (rewritten) {
          parsedReport.perfect_essay = rewritten;
        }
      }
    }

    const finalReport = parsedReport
      ? normalizeEssayReport(parsedReport, prompt, essay)
      : buildDeterministicEssayReport(prompt, essay);

    return NextResponse.json({
      report: finalReport,
      isLiveAI: Boolean(parsedReport),
      modelUsed: modelUsed || 'fallback',
    });
  } catch (err: unknown) {
    console.error('Essay Grader Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
