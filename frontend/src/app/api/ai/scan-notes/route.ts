import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GEMINI_CANDIDATE_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import { normalizeLatexMarkdown } from '../../../../../../shared/lib/latexNormalizer';

const GEMINI_MODELS = [...GEMINI_CANDIDATE_MODELS];

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Please upload a valid image' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    const prompt = `You are an expert STEM & academic handwritten notes OCR assistant.
Transcribe the attached study notes accurately into clean Markdown.
RULES:
1. Preserve structure using Markdown headings (##, ###), bullet lists, GFM tables, and **bold** terms.
2. Wrap inline math strictly in single dollar signs ($...$) and multi-line/block formulas strictly in double dollar signs ($$...$$). Never use \\(...\\) or \\[...\\].
3. If the page contains diagrams or figures, add a short bullet describing what is drawn.
4. Do NOT invent or extrapolate facts not visible in the image. Transcribe illegible words as [illegible].`;

    let transcription = '';

    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.1 },
          });
          const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Image, mimeType: file.type } },
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

    if (!transcription && process.env.OPENROUTER_API_KEY) {
      for (const model of OPENROUTER_CANDIDATE_MODELS) {
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
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'image_url',
                      image_url: { url: `data:${file.type};base64,${base64Image}` },
                    },
                  ],
                },
              ],
            }),
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

    if (!transcription) {
      return NextResponse.json(
        { error: 'Could not transcribe image. Please ensure image is clear and try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transcription: normalizeLatexMarkdown(transcription),
    });
  } catch (err: unknown) {
    console.error('Notes Scanner Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
