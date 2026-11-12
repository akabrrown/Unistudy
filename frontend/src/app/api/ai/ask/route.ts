import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';

export const dynamic = 'force-dynamic';

const AskRequestSchema = z.object({
  feature: z.string().min(1).max(100),
  payload: z.object({
    prompt: z.string().optional(),
    systemPrompt: z.string().optional(),
    stream: z.boolean().optional(),
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
    })).optional()
  })
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = AskRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.format() }, { status: 400 });
    }

    const { payload } = parsed.data;
    const rawMessages = payload.messages && payload.messages.length > 0
      ? payload.messages
      : payload.prompt
        ? [{ role: 'user' as const, content: payload.prompt }]
        : [];

    if (rawMessages.length === 0) {
      return NextResponse.json({ error: 'Prompt or messages required' }, { status: 400 });
    }

    const systemPrompt = payload.systemPrompt || 'You are an expert AI university tutor. Provide clear, highly readable, well-structured pedagogical explanations using markdown headers, bullet points, and LaTeX for math.';

    let reply = '';

    // 1. Try Groq first for low-latency chat responses
    if (process.env.GROQ_API_KEY) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const groqMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...rawMessages.map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: String(m.content || '')
        }))
      ];

      for (const model of GROQ_SMART_MODELS) {
        try {
          const completion = await groq.chat.completions.create({
            model,
            messages: groqMessages,
            temperature: 0.6,
          });
          const text = completion.choices[0]?.message?.content?.trim();
          if (text) {
            reply = text;
            break;
          }
        } catch (groqErr: unknown) {
          const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
          console.warn(`[API /ai/ask] Groq model ${model} failed:`, msg);
        }
      }
    }

    // 2. Fallback to Google Generative AI
    if (!reply && process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt
          });

          const contents = rawMessages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || '') }]
          }));

          const res = await model.generateContent({ contents });
          const text = res.response.text()?.trim();
          if (text) {
            reply = text;
            break;
          }
        } catch (mErr: unknown) {
          const msg = mErr instanceof Error ? mErr.message : String(mErr);
          console.warn(`[API /ai/ask] Gemini model ${modelName} failed:`, msg);
        }
      }
    }

    // 3. Fallback to OpenRouter
    if (!reply && process.env.OPENROUTER_API_KEY) {
      const orMessages = [
        { role: 'system', content: systemPrompt },
        ...rawMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '')
        }))
      ];

      for (const model of OPENROUTER_CANDIDATE_MODELS) {
        try {
          const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages: orMessages, temperature: 0.6 })
          });

          if (orRes.ok) {
            const data = await orRes.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) {
              reply = text;
              break;
            }
          }
        } catch (orErr: unknown) {
          const msg = orErr instanceof Error ? orErr.message : String(orErr);
          console.warn(`[API /ai/ask] OpenRouter model ${model} failed:`, msg);
        }
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: 'Unable to reach AI providers right now. Please retry shortly.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      result: {
        choices: [
          {
            message: {
              content: reply
            }
          }
        ]
      },
      provider: 'assistant'
    });
  } catch (err: unknown) {
    console.error('API /ai/ask error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
