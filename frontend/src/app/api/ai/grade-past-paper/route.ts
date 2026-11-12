import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { requireAuth } from '@/lib/security/adminGuard';
import { highCostRatelimit } from '@/lib/ratelimit';
import { createClient } from '@/lib/supabase/server';
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import { retrieveRelevantSlideChunks } from '../../../../../../shared/lib/aiTutor';
import {
  buildPastPaperBatchPrompt,
  buildSingleRepairPrompt,
  isModelAnswerIncomplete,
  normalizeBatchGradingResults,
  parsePastPaperJsonResults,
  type PastPaperAnswerInput,
  type PastPaperGradeItem,
} from '../../../../../../shared/lib/pastPaperGrader';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GradeBatchRequestSchema = z.object({
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        question_content: z.string().min(1).max(15000),
        marks_available: z.coerce.number().min(0).max(500).default(0),
        student_answer: z.string().max(20000).nullable().optional(),
        slide_context: z.string().max(12000).nullable().optional(),
      })
    )
    .min(1)
    .max(50),
  is_ultra: z.boolean().optional().default(false),
  course_id: z.string().optional(),
});

async function runJsonPromptWithProviders(promptText: string, maxTokens = 4000): Promise<string | null> {
  if (process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    for (const model of GROQ_SMART_MODELS) {
      try {
        const res = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: promptText }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: maxTokens,
        });
        const text = res.choices[0]?.message?.content?.trim();
        if (text) return text;
      } catch (err) {
        console.warn(`[GradePastPaper] Groq ${model} failed:`, err instanceof Error ? err.message : err);
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
            temperature: 0.2,
            maxOutputTokens: maxTokens,
          },
        });
        const res = await model.generateContent(promptText);
        const text = res.response.text()?.trim();
        if (text) return text;
      } catch (err) {
        console.warn(`[GradePastPaper] Gemini ${modelName} failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.2,
            max_tokens: maxTokens,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content?.trim();
          if (text) return text;
        }
      } catch (err) {
        console.warn(`[GradePastPaper] OpenRouter ${model} failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.userId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { success } = await highCostRatelimit.limit(auth.userId);
      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment before grading again.' },
          { status: 429 }
        );
      }
    } catch (rlErr) {
      console.warn('[GradePastPaper] Rate limiter warning (continuing):', rlErr);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsedInput = GradeBatchRequestSchema.safeParse(rawBody);
    if (!parsedInput.success) {
      return NextResponse.json(
        { error: parsedInput.error.issues[0]?.message || 'Invalid grading payload' },
        { status: 400 }
      );
    }

    const { answers, is_ultra, course_id } = parsedInput.data;
    const enrichedAnswers: PastPaperAnswerInput[] = answers.map((a) => ({ ...a }));

    // Ground answers in course lecture slides when course_id is provided
    if (course_id) {
      try {
        const supabase = await createClient();
        const { data: slides } = await supabase
          .from('slides')
          .select('slide_number, raw_text, explanation, lectures!inner(course_id)')
          .eq('lectures.course_id', course_id)
          .limit(120);

        if (slides && slides.length > 0) {
          for (const item of enrichedAnswers) {
            if (item.slide_context) continue;
            const chunks = retrieveRelevantSlideChunks(item.question_content, slides, undefined, 3);
            if (chunks.length > 0) {
              item.slide_context = chunks
                .map((c) => `[Slide ${c.slideNumber}]: ${c.excerpt}`)
                .join('\n\n');
            }
          }
        }
      } catch (ragErr) {
        console.warn('[GradePastPaper] Slide grounding lookup warning:', ragErr);
      }
    }

    const CHUNK_SIZE = 2;
    const allResults: PastPaperGradeItem[] = [];

    for (let i = 0; i < enrichedAnswers.length; i += CHUNK_SIZE) {
      const chunk = enrichedAnswers.slice(i, i + CHUNK_SIZE);
      const batchPrompt = buildPastPaperBatchPrompt(chunk, is_ultra);
      const rawText = await runJsonPromptWithProviders(batchPrompt, 4000);
      const rawJsonList = rawText ? parsePastPaperJsonResults(rawText) : [];
      const { results, incompleteIds } = normalizeBatchGradingResults(chunk, rawJsonList);

      // Targeted single-item repair pass for any skipped question or missing sub-parts
      for (const badId of incompleteIds) {
        const sourceItem = chunk.find((c) => c.id === badId);
        if (!sourceItem) continue;
        const repairRaw = await runJsonPromptWithProviders(
          buildSingleRepairPrompt(sourceItem, is_ultra),
          3500
        );
        if (repairRaw) {
          const repairParsed = parsePastPaperJsonResults(repairRaw);
          const repaired = normalizeBatchGradingResults([sourceItem], repairParsed).results[0];
          const existingIdx = results.findIndex((r) => r.id === badId);
          if (
            repaired &&
            existingIdx >= 0 &&
            (!isModelAnswerIncomplete(sourceItem.question_content, repaired.model_answer) ||
              repaired.model_answer.length > results[existingIdx].model_answer.length)
          ) {
            results[existingIdx] = repaired;
          }
        }
      }

      allResults.push(...results);
    }

    return NextResponse.json({ success: true, data: allResults });
  } catch (err) {
    console.error('[GradePastPaper] Route error:', err);
    return NextResponse.json(
      { error: 'Failed to grade past paper questions' },
      { status: 500 }
    );
  }
}

