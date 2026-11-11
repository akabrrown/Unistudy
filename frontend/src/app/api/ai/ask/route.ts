import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

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
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try Google Generative AI
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt
          });

          // Format contents
          const contents = rawMessages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || '') }]
          }));

          const res = await model.generateContent({ contents });
          const text = res.response.text();
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

    // 2. Try Groq fallback
    if (!reply && process.env.GROQ_API_KEY) {
      try {
        const groqMessages = [
          { role: 'system', content: systemPrompt },
          ...rawMessages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
        ];

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            temperature: 0.6
          })
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          reply = data.choices?.[0]?.message?.content || '';
        }
      } catch (groqErr: unknown) {
        const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
        console.warn('[API /ai/ask] Groq fallback failed:', msg);
      }
    }

    if (!reply) {
      reply = "I'm having trouble connecting to the AI models right now. Please check your network or try again in a moment.";
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
