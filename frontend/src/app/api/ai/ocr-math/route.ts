import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { requireAuth } from '@/lib/security/adminGuard';
import { highCostRatelimit } from '@/lib/ratelimit';
import {
  GEMINI_CANDIDATE_MODELS,
  MISTRAL_VISION_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import {
  buildMathOcrPrompt,
  cleanExtractedMathText,
  extractRawBase64AndMime,
  normalizeVisionMime,
} from '../../../../../../shared/lib/mathSolver';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OCR_PROVIDER_TIMEOUT_MS = 10000;

const OcrRequestSchema = z.object({
  imageBase64: z.string().max(12_000_000).optional(),
  mimeType: z.string().max(100).optional().default('image/jpeg'),
  mode: z.enum(['math', 'graph']).optional().default('math'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.userId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const rlRes = (await highCostRatelimit.limit(auth.userId)) as { success?: boolean } | null;
      if (rlRes && rlRes.success === false) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment before extracting another image.' },
          { status: 429 }
        );
      }
    } catch (rlErr) {
      console.warn('[OcrMath] Rate limiter notice:', rlErr);
    }

    let base64Data = '';
    let effectiveMime = 'image/jpeg';
    let mode: 'math' | 'graph' = 'math';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const rawMode = String(formData.get('mode') || 'math').trim();
      if (rawMode === 'graph') mode = 'graph';
      if (!file) {
        return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Data = buffer.toString('base64');
      effectiveMime = normalizeVisionMime(file.type);
    } else {
      let rawJson: unknown;
      try {
        rawJson = await req.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
      const parsed = OcrRequestSchema.safeParse(rawJson);
      if (!parsed.success || !parsed.data.imageBase64) {
        return NextResponse.json({ error: 'Please provide an imageBase64 payload' }, { status: 400 });
      }
      mode = parsed.data.mode;
      const extracted = extractRawBase64AndMime(parsed.data.imageBase64, parsed.data.mimeType);
      base64Data = extracted.data;
      effectiveMime = extracted.mimeType;
    }

    if (!base64Data) {
      return NextResponse.json({ error: 'Empty image payload' }, { status: 400 });
    }

    const ocrPrompt = buildMathOcrPrompt(mode);
    const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
    let extractedText = '';
    let providerUsed = '';

    // 1. Mistral Vision (ministral-14b-latest / ministral-8b-latest — fast 1-2s STEM OCR)
    if (!extractedText && process.env.MISTRAL_API_KEY) {
      for (const model of MISTRAL_VISION_MODELS) {
        try {
          const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(OCR_PROVIDER_TIMEOUT_MS),
            headers: {
              Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              temperature: 0.1,
              max_tokens: 3000,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: ocrPrompt },
                    { type: 'image_url', image_url: dataUrl },
                  ],
                },
              ],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            if (content) {
              extractedText = cleanExtractedMathText(content);
              providerUsed = `mistral:${model}`;
              break;
            }
          }
        } catch (mErr) {
          console.warn(
            `[OcrMath] Mistral ${model} failed:`,
            mErr instanceof Error ? mErr.message : mErr
          );
        }
      }
    }

    // 2. OpenRouter Vision (google/gemini-2.5-flash-lite & google/gemini-2.5-flash with explicit max_tokens)
    if (!extractedText && process.env.OPENROUTER_API_KEY) {
      const visionModels = [
        ...OPENROUTER_CANDIDATE_MODELS.filter((m) => m.startsWith('google/')),
        ...OPENROUTER_CANDIDATE_MODELS.filter((m) => !m.startsWith('google/')),
      ];
      for (const model of visionModels) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(OCR_PROVIDER_TIMEOUT_MS),
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              temperature: 0.1,
              max_tokens: 3000,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: ocrPrompt },
                    { type: 'image_url', image_url: { url: dataUrl } },
                  ],
                },
              ],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            if (content) {
              extractedText = cleanExtractedMathText(content);
              providerUsed = `openrouter:${model}`;
              break;
            }
          }
        } catch (orErr) {
          console.warn(
            `[OcrMath] OpenRouter ${model} failed:`,
            orErr instanceof Error ? orErr.message : orErr
          );
        }
      }
    }

    // 3. Direct Google Gemini Vision fallback (gemini-3.1-flash-lite, gemini-3.8-flash, etc.)
    if (!extractedText && process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.1, maxOutputTokens: 3000 },
          });
          const res = await Promise.race([
            model.generateContent([
              ocrPrompt,
              { inlineData: { data: base64Data, mimeType: effectiveMime } },
            ]),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Gemini OCR timeout')), OCR_PROVIDER_TIMEOUT_MS)
            ),
          ]);
          const rawResult = res.response.text().trim();
          if (rawResult) {
            extractedText = cleanExtractedMathText(rawResult);
            providerUsed = `gemini:${modelName}`;
            break;
          }
        } catch (gemErr) {
          console.warn(
            `[OcrMath] Gemini ${modelName} failed:`,
            gemErr instanceof Error ? gemErr.message : gemErr
          );
        }
      }
    }

    if (!extractedText) {
      return NextResponse.json(
        {
          error:
            'Could not extract mathematical text from image. Please ensure the image is clear and well-lit.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      extractedText,
      provider: providerUsed,
    });
  } catch (err: unknown) {
    console.error('[OcrMath] Route error:', err);
    return NextResponse.json(
      { error: 'Internal error processing image OCR' },
      { status: 500 }
    );
  }
}
