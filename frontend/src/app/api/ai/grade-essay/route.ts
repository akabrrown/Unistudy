import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { highCostRatelimit } from '@/lib/ratelimit';
import {
  buildEssayGraderPrompt,
  buildPerfectEssayRewritePrompt,
  parseEssayReportJson,
  normalizeEssayReport,
  buildDeterministicEssayReport,
} from '../../../../../../shared/lib/essayGrader';

const RequestSchema = z.object({
  prompt: z.string().trim().min(10, 'Prompt is too short (minimum 10 characters)').max(4000, 'Prompt is too long'),
  essay: z.string().trim().min(50, 'Essay is too short to grade (minimum 50 characters)').max(30000, 'Essay exceeds maximum length'),
});

const GEMINI_CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

async function generateModelEssayFallback(
  prompt: string,
  essay: string,
  weaknesses: string[]
): Promise<string | null> {
  const rewritePrompt = buildPerfectEssayRewritePrompt(prompt, essay, weaknesses);

  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    for (const modelName of GEMINI_CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 4096 },
        });
        const res = await model.generateContent(rewritePrompt);
        const text = res.response.text().trim();
        if (text.length >= 120) return text;
      } catch (err: unknown) {
        console.warn(`Gemini ${modelName} rewrite pass failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: rewritePrompt }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4096,
      });
      const text = completion.choices[0]?.message?.content?.trim() || '';
      if (text.length >= 120) return text;
    } catch (err: unknown) {
      console.warn('Groq rewrite pass failed:', err instanceof Error ? err.message : err);
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
    const { prompt, essay } = parsedInput.data;

    const systemPrompt = buildEssayGraderPrompt(prompt, essay);
    let parsedReport: Record<string, unknown> | null = null;

    // 1. Try Gemini models with fallback
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 4096,
            },
          });
          const result = await model.generateContent(systemPrompt);
          const candidate = parseEssayReportJson(result.response.text());
          if (candidate) {
            parsedReport = candidate;
            break;
          }
        } catch (geminiErr: unknown) {
          console.warn(
            `Gemini model ${modelName} failed on essay grading:`,
            geminiErr instanceof Error ? geminiErr.message : geminiErr
          );
        }
      }
    }

    // 2. Fallback to Groq if Gemini failed or is unconfigured
    if (!parsedReport && process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: systemPrompt }],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          max_tokens: 4096,
        });

        const candidate = parseEssayReportJson(completion.choices[0]?.message?.content || '');
        if (candidate) {
          parsedReport = candidate;
        }
      } catch (groqErr: unknown) {
        console.warn(
          'Groq fallback failed on essay grading:',
          groqErr instanceof Error ? groqErr.message : groqErr
        );
      }
    }

    // 3. Secondary AI pass if grading JSON succeeded but omitted/truncated perfect_essay
    if (parsedReport) {
      const existingPerfect =
        typeof parsedReport.perfect_essay === 'string' ? parsedReport.perfect_essay.trim() : '';
      if (existingPerfect.length < 120) {
        const rawWeaknesses = Array.isArray(parsedReport.weaknesses)
          ? parsedReport.weaknesses.map((w) => String(w))
          : [];
        const rewritten = await generateModelEssayFallback(prompt, essay, rawWeaknesses);
        if (rewritten) {
          parsedReport.perfect_essay = rewritten;
        }
      }
    }

    const finalReport = parsedReport
      ? normalizeEssayReport(parsedReport, prompt, essay)
      : buildDeterministicEssayReport(prompt, essay);

    return NextResponse.json({ report: finalReport });
  } catch (err: unknown) {
    console.error('Essay Grader Error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
