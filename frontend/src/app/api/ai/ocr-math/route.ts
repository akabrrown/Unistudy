import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { requireAuth } from '@/lib/security/adminGuard';
import { highCostRatelimit } from '@/lib/ratelimit';
import {
  GEMINI_CANDIDATE_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import { normalizeLatexMarkdown } from '../../../../../../shared/lib/latexNormalizer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OCR_TIMEOUT_MS = 10000;

const OcrRequestSchema = z.object({
  imageBase64: z.string().max(12_000_000).optional(),
  mimeType: z.string().max(100).optional().default('image/jpeg'),
});

function normalizeMime(raw?: string): string {
  const lower = (raw || '').trim().toLowerCase();
  if (lower === 'image/jpg' || lower === 'image/jpeg') return 'image/jpeg';
  if (lower === 'image/png') return 'image/png';
  if (lower === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

function extractRawBase64(input: string): { data: string; mimeType: string } {
  const trimmed = input.trim();
  const marker = ';base64,';
  const markerIdx = trimmed.indexOf(marker);
  if (trimmed.startsWith('data:') && markerIdx !== -1) {
    const rawMime = trimmed.slice(5, markerIdx);
    const rawData = trimmed.slice(markerIdx + marker.length).replace(/\s+/g, '');
    return { data: rawData, mimeType: normalizeMime(rawMime) };
  }
  return { data: trimmed.replace(/\s+/g, ''), mimeType: 'image/jpeg' };
}

const OCR_MATH_PROMPT = `You are an expert STEM and mathematics handwriting/print transcription OCR engine.
Transcribe the mathematical problem, question text, equations, formulas, coordinates, and instructions visible in the attached image EXACTLY as written.

TRANSCRIPTION RULES:
1. Transcribe verbatim. Preserve every number, variable name, sign (+/-), fraction, superscript, subscript, and parenthesis without change.
2. Format inline math using single dollar signs $...$ and standalone equations using double dollar signs $$...$$. Never use \\(...\\) or \\[...\\].
3. If coordinates are visible (e.g. A(2, 4), B(2, 8)), transcribe them accurately.
4. If multiple parts or sub-questions exist (e.g. (a), (b), (i), (ii)), keep their exact labels.
5. Do NOT solve the problem. Do NOT write solutions or answers. Return ONLY the transcribed question text.
6. If a character or number is smudged or completely illegible, mark it as [?]. Never invent numbers or equations not present in the image.`;

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

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Data = buffer.toString('base64');
      effectiveMime = normalizeMime(file.type);
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
      const extracted = extractRawBase64(parsed.data.imageBase64);
      base64Data = extracted.data;
      effectiveMime = normalizeMime(parsed.data.mimeType || extracted.mimeType);
    }

    if (!base64Data) {
      return NextResponse.json({ error: 'Empty image payload' }, { status: 400 });
    }

    let extractedText = '';

    // 1. Gemini Vision (Fastest and most accurate for STEM handwriting/diagrams)
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
          });
          const res = await Promise.race([
            model.generateContent([
              OCR_MATH_PROMPT,
              { inlineData: { data: base64Data, mimeType: effectiveMime } },
            ]),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Gemini OCR timeout')), OCR_TIMEOUT_MS)
            ),
          ]);
          const rawResult = res.response.text().trim();
          if (rawResult) {
            extractedText = normalizeLatexMarkdown(rawResult);
            break;
          }
        } catch (gemErr) {
          console.warn(`[OcrMath] Gemini ${modelName} failed:`, gemErr instanceof Error ? gemErr.message : gemErr);
        }
      }
    }

    // 2. OpenRouter Vision fallback
    if (!extractedText && process.env.OPENROUTER_API_KEY) {
      const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
      const visionModels = [
        ...OPENROUTER_CANDIDATE_MODELS.filter((m) => m.startsWith('google/')),
        ...OPENROUTER_CANDIDATE_MODELS.filter((m) => !m.startsWith('google/')),
      ];
      for (const model of visionModels) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
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
                    { type: 'text', text: OCR_MATH_PROMPT },
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
              extractedText = normalizeLatexMarkdown(content);
              break;
            }
          }
        } catch (orErr) {
          console.warn(`[OcrMath] OpenRouter ${model} failed:`, orErr instanceof Error ? orErr.message : orErr);
        }
      }
    }

    // 3. Groq Vision fallback
    if (!extractedText && process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const groqRes = await groq.chat.completions.create({
          model: 'llama-3.2-11b-vision-preview',
          temperature: 0.1,
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: OCR_MATH_PROMPT },
                { type: 'image_url', image_url: { url: `data:${effectiveMime};base64,${base64Data}` } },
              ],
            },
          ],
        });
        const content = groqRes.choices?.[0]?.message?.content?.trim();
        if (content) {
          extractedText = normalizeLatexMarkdown(content);
        }
      } catch (groqErr) {
        console.warn('[OcrMath] Groq vision failed:', groqErr);
      }
    }

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Could not extract mathematical text from image. Please ensure the image is clear and well-lit.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      extractedText,
    });
  } catch (err: unknown) {
    console.error('[OcrMath] Route error:', err);
    return NextResponse.json(
      { error: 'Internal error processing image OCR' },
      { status: 500 }
    );
  }
}
