import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { requireAuth } from '@/lib/security/adminGuard';
import { highCostRatelimit } from '@/lib/ratelimit';
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import {
  buildGraphSolverPrompt,
  parseDeterministicGraphProblem,
  parseGraphSpecJson,
  resolveGraphSpec,
  type GraphSpec,
} from '../../../../../../shared/lib/graphSolver';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_PROVIDER_TIMEOUT_MS = 6500;
const TOTAL_SOLVE_BUDGET_MS = 22000;

const SolveGraphRequestSchema = z
  .object({
    problem: z.string().trim().max(10000).optional(),
    imageBase64: z.string().max(8_000_000).optional(),
    mimeType: z
      .string()
      .regex(/^image\/(png|jpeg|jpg|webp|gif)$/i)
      .optional(),
  })
  .refine(
    (val) => Boolean(val.problem?.trim()) || Boolean(val.imageBase64),
    'Please enter a graph problem or upload an image.'
  );

function stripDataUrlPrefix(base64OrDataUrl: string): { data: string; mimeType: string } {
  const match = base64OrDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/png', data: base64OrDataUrl };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  const remainingBudget = () => Math.max(0, TOTAL_SOLVE_BUDGET_MS - (Date.now() - requestStart));

  try {
    const auth = await requireAuth();
    if (auth.error || !auth.userId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsedInput = SolveGraphRequestSchema.safeParse(rawBody);
    if (!parsedInput.success) {
      return NextResponse.json(
        { error: parsedInput.error.issues[0]?.message || 'Invalid graph request' },
        { status: 400 }
      );
    }

    const { problem = '', imageBase64, mimeType } = parsedInput.data;

    // Fast-path deterministic CAS & coordinate geometry solver BEFORE calling any external LLM
    if (!imageBase64 && problem.trim()) {
      const deterministicSpec = parseDeterministicGraphProblem(problem);
      if (
        deterministicSpec &&
        (deterministicSpec.functions.length > 0 ||
          deterministicSpec.shapes.length > 0 ||
          deterministicSpec.points.length > 0)
      ) {
        return NextResponse.json({
          spec: deterministicSpec,
          modelUsed: 'deterministic-cas',
        });
      }
    }

    try {
      const rlRes = (await withTimeout(
        highCostRatelimit.limit(auth.userId),
        1500,
        'RateLimiter'
      )) as { success?: boolean } | null;
      if (rlRes && rlRes.success === false) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment before solving another graph.' },
          { status: 429 }
        );
      }
    } catch (rlErr) {
      console.warn('[SolveGraph] Rate limiter warning (continuing):', rlErr);
    }

    const promptText = buildGraphSolverPrompt(problem);

    let rawCandidate: Record<string, unknown> | null = null;
    let modelUsed: string | null = null;

    if (imageBase64) {
      const img = stripDataUrlPrefix(imageBase64);
      const effectiveMime = mimeType || img.mimeType;

      // 1. Gemini Vision (first 2 fast models with strict timeout)
      if (process.env.GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const geminiModels = [GEMINI_CANDIDATE_MODELS[0], GEMINI_CANDIDATE_MODELS[GEMINI_CANDIDATE_MODELS.length - 1]];
        for (const modelName of geminiModels) {
          const budget = Math.min(PER_PROVIDER_TIMEOUT_MS, remainingBudget());
          if (budget < 1500) break;
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                maxOutputTokens: 2500,
              },
            });
            const res = await withTimeout(
              model.generateContent([
                promptText,
                { inlineData: { data: img.data, mimeType: effectiveMime } },
              ]),
              budget,
              `Gemini vision (${modelName})`
            );
            const candidate = parseGraphSpecJson(res.response.text());
            if (candidate) {
              rawCandidate = candidate;
              modelUsed = modelName;
              break;
            }
          } catch (err) {
            console.warn(`[SolveGraph] Gemini vision ${modelName} failed:`, err instanceof Error ? err.message : err);
          }
        }
      }

      // 2. OpenRouter Vision fallback (vision-capable Gemini models only)
      if (!rawCandidate && process.env.OPENROUTER_API_KEY && remainingBudget() >= 2000) {
        const dataUrl = `data:${effectiveMime};base64,${img.data}`;
        const openRouterVisionModels = OPENROUTER_CANDIDATE_MODELS.filter((m) => m.includes('gemini'));
        for (const model of openRouterVisionModels) {
          const budget = Math.min(PER_PROVIDER_TIMEOUT_MS, remainingBudget());
          if (budget < 1500) break;
          try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              signal: AbortSignal.timeout(budget),
              headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                temperature: 0.1,
                max_tokens: 2500,
                messages: [
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: promptText },
                      { type: 'image_url', image_url: { url: dataUrl } },
                    ],
                  },
                ],
              }),
            });
            if (res.ok) {
              const json = await res.json();
              const candidate = parseGraphSpecJson(json.choices?.[0]?.message?.content || '');
              if (candidate) {
                rawCandidate = candidate;
                modelUsed = model;
                break;
              }
            }
          } catch (err) {
            console.warn(`[SolveGraph] OpenRouter vision ${model} failed:`, err instanceof Error ? err.message : err);
          }
        }
      }
    } else {
      // Text-only exotic word problem cascade with strict timeout per call: Groq -> Gemini -> OpenRouter
      if (process.env.GROQ_API_KEY) {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        for (const model of GROQ_SMART_MODELS.slice(0, 2)) {
          const budget = Math.min(PER_PROVIDER_TIMEOUT_MS, remainingBudget());
          if (budget < 1500) break;
          try {
            const completion = await withTimeout(
              groq.chat.completions.create({
                model,
                messages: [{ role: 'user', content: promptText }],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: 2500,
              }),
              budget,
              `Groq (${model})`
            );
            const candidate = parseGraphSpecJson(completion.choices[0]?.message?.content || '');
            if (candidate) {
              rawCandidate = candidate;
              modelUsed = model;
              break;
            }
          } catch (err) {
            console.warn(`[SolveGraph] Groq ${model} failed:`, err instanceof Error ? err.message : err);
          }
        }
      }

      if (!rawCandidate && process.env.GEMINI_API_KEY && remainingBudget() >= 2000) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const geminiModels = [GEMINI_CANDIDATE_MODELS[0], GEMINI_CANDIDATE_MODELS[GEMINI_CANDIDATE_MODELS.length - 1]];
        for (const modelName of geminiModels) {
          const budget = Math.min(PER_PROVIDER_TIMEOUT_MS, remainingBudget());
          if (budget < 1500) break;
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                maxOutputTokens: 2500,
              },
            });
            const res = await withTimeout(
              model.generateContent(promptText),
              budget,
              `Gemini (${modelName})`
            );
            const candidate = parseGraphSpecJson(res.response.text());
            if (candidate) {
              rawCandidate = candidate;
              modelUsed = modelName;
              break;
            }
          } catch (err) {
            console.warn(`[SolveGraph] Gemini ${modelName} failed:`, err instanceof Error ? err.message : err);
          }
        }
      }

      if (!rawCandidate && process.env.OPENROUTER_API_KEY && remainingBudget() >= 2000) {
        for (const model of OPENROUTER_CANDIDATE_MODELS.slice(0, 2)) {
          const budget = Math.min(PER_PROVIDER_TIMEOUT_MS, remainingBudget());
          if (budget < 1500) break;
          try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              signal: AbortSignal.timeout(budget),
              headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                temperature: 0.1,
                max_tokens: 2500,
                messages: [{ role: 'user', content: promptText }],
              }),
            });
            if (res.ok) {
              const json = await res.json();
              const candidate = parseGraphSpecJson(json.choices?.[0]?.message?.content || '');
              if (candidate) {
                rawCandidate = candidate;
                modelUsed = model;
                break;
              }
            }
          } catch (err) {
            console.warn(`[SolveGraph] OpenRouter ${model} failed:`, err instanceof Error ? err.message : err);
          }
        }
      }
    }

    let resolvedSpec: GraphSpec | null = null;
    if (rawCandidate) {
      try {
        resolvedSpec = resolveGraphSpec(rawCandidate);
      } catch (zodErr) {
        console.warn('[SolveGraph] LLM output failed GraphSpec validation:', zodErr);
      }
    }

    if (!resolvedSpec && problem.trim()) {
      resolvedSpec = parseDeterministicGraphProblem(problem);
      if (resolvedSpec) {
        modelUsed = 'deterministic-fallback';
      }
    }

    if (!resolvedSpec) {
      return NextResponse.json(
        {
          error:
            remainingBudget() < 1500
              ? 'AI provider timed out while processing the graph. Try typing the equation or coordinates directly.'
              : 'Unable to parse or solve this graph problem right now. Please try clarifying the equations or coordinates.',
        },
        { status: remainingBudget() < 1500 ? 504 : 422 }
      );
    }

    return NextResponse.json({
      spec: resolvedSpec,
      modelUsed,
    });
  } catch (err: unknown) {
    console.error('[SolveGraph] Route error:', err);
    return NextResponse.json(
      { error: 'Failed to solve graph problem' },
      { status: 500 }
    );
  }
}
