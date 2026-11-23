import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { enforceHighCostLimit } from '@/lib/ratelimit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GEMINI_CANDIDATE_MODELS,
  MISTRAL_VISION_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import { normalizeLatexMarkdown } from '../../../../../../shared/lib/latexNormalizer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GEMINI_MODELS = [...GEMINI_CANDIDATE_MODELS];

function buildScanModeInstruction(mode: string): string {
  switch (mode) {
    case 'equations':
      return 'Prioritize mathematical equations, symbolic derivations, matrices, and step-by-step proofs. Format every multi-line step cleanly in $$...$$ blocks and preserve all subscripts, superscripts, and domain constraints.';
    case 'tables':
      return 'Prioritize tabular structures, comparison charts, and structured data lists. Convert all grid/columnar handwriting into valid GitHub Flavored Markdown (GFM) tables.';
    case 'summary':
      return 'Transcribe the handwritten notes faithfully first, then append a concise "## Key Exam Takeaways" section summarizing the core definitions and formulas visible on the page.';
    default:
      return 'Preserve the complete document hierarchy using Markdown headings (##, ###), bullet lists, GFM tables, and **bold** key terms.';
  }
}

export async function POST(req: NextRequest) {
  let releaseGuard: (() => void) | undefined;
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const limit = await enforceHighCostLimit(userId || 'anon');
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many scan requests. Please slow down and try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }
    releaseGuard = limit.release;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mode = String(formData.get('mode') || 'full').trim();

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Please upload a valid image' }, { status: 400 });
    }

    // Verify and deduct 1 credit for scanning notes
    const { deductUserCredits } = await import('@/lib/ai/quota');
    const creditCheck = await deductUserCredits(userId!, 'scan-notes', 'gemini', 1);
    if (!creditCheck.allowed) {
      return NextResponse.json(
        {
          error: creditCheck.error || 'You have exhausted your AI Credits (0 remaining). Please top up in Billing to continue.',
          code: 'INSUFFICIENT_CREDITS',
          remainingCredits: creditCheck.remainingCredits,
        },
        { status: 402 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type || 'image/jpeg';

    const modeDirective = buildScanModeInstruction(mode);
    const prompt = `You are an expert STEM & academic handwritten notes OCR assistant.
Transcribe the attached study notes accurately into clean Markdown.
MODE DIRECTIVE: ${modeDirective}
RULES:
1. Preserve structure using Markdown headings (##, ###), bullet lists, GFM tables, and **bold** terms.
2. Wrap inline math strictly in single dollar signs ($...$) and multi-line/block formulas strictly in double dollar signs ($$...$$). Never use \\(...\\) or \\[...\\].
3. If the page contains diagrams or figures, add a short bullet describing what is drawn.
4. Do NOT invent or extrapolate facts not visible in the image. Transcribe illegible words as [illegible].`;

    let transcription = '';

    // 1. Mistral Vision (ministral-14b-latest / ministral-8b-latest)
    if (!transcription && process.env.MISTRAL_API_KEY) {
      for (const model of MISTRAL_VISION_MODELS) {
        try {
          const mRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              temperature: 0.1,
              max_tokens: 2200,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'image_url',
                      image_url: `data:${mimeType};base64,${base64Image}`,
                    },
                  ],
                },
              ],
            }),
            signal: AbortSignal.timeout(12000),
          });
          if (mRes.ok) {
            const data = await mRes.json();
            transcription = data.choices?.[0]?.message?.content || '';
            if (transcription) break;
          }
        } catch (err: unknown) {
          console.warn(
            `Mistral scan notes model ${model} failed:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    }

    // 2. OpenRouter Vision (google/gemini-2.5-flash-lite & google/gemini-2.5-flash)
    if (!transcription && process.env.OPENROUTER_API_KEY) {
      const visionModels = [
        ...OPENROUTER_CANDIDATE_MODELS.filter((m) => m.startsWith('google/')),
        ...OPENROUTER_CANDIDATE_MODELS.filter((m) => !m.startsWith('google/')),
      ];
      for (const model of visionModels) {
        try {
          const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              temperature: 0.1,
              max_tokens: 2000,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'image_url',
                      image_url: { url: `data:${mimeType};base64,${base64Image}` },
                    },
                  ],
                },
              ],
            }),
            signal: AbortSignal.timeout(12000),
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            transcription = data.choices?.[0]?.message?.content || '';
            if (transcription) break;
          }
        } catch (err: unknown) {
          console.warn(
            `OpenRouter scan notes model ${model} failed:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    }

    // 3. Direct Google Gemini Vision fallback
    if (!transcription && process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
          });
          const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Image, mimeType } },
          ]);
          transcription = result.response.text();
          if (transcription) break;
        } catch (err: unknown) {
          console.warn(
            `Gemini scan notes model ${modelName} failed:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    }

    if (!transcription) {
      return NextResponse.json(
        { error: 'Could not transcribe image. Please ensure image is clear and try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transcription: normalizeLatexMarkdown(transcription),
      remainingCredits: creditCheck.remainingCredits,
    });
  } catch (err: unknown) {
    console.error('Notes Scanner Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    releaseGuard?.();
  }
}
