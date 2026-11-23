import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_FAST_MODELS,
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
  AGENTROUTER_CANDIDATE_MODELS,
} from '../../../../../../shared/constants/aiModels';
import {
  TutorGroundingSchema,
  type TutorGroundingInput,
  buildGroundedTutorPrompt,
  detectTutorCommandMode,
  retrieveRelevantSlideChunks,
  sanitizeTutorResponse,
} from '../../../../../../shared/lib/aiTutor';
import {
  stripPhantomSlideCitations,
  verifyResponseGrounding,
  type GroundingSource,
} from '../../../../../../shared/lib/groundingVerifier';

export const dynamic = 'force-dynamic';

const AskRequestSchema = z.object({
  feature: z.string().min(1).max(100),
  payload: z.object({
    prompt: z.string().optional(),
    systemPrompt: z.string().optional(),
    stream: z.boolean().optional(),
    temperature: z.number().min(0).max(1).optional(),
    model: z.string().optional(),
    grounding: z.unknown().optional(),
    tutorName: z.string().optional(),
    tutorPersonality: z.string().optional(),
    tutorTone: z.string().optional(),
    studentConfig: z.unknown().optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant', 'system']),
          content: z.string(),
        })
      )
      .optional(),
  }),
});

interface ProviderResult {
  text: string;
  provider: string;
  model: string;
}

async function tryGroq(
  systemPrompt: string,
  rawMessages: Array<{ role: string; content: string }>,
  temperature: number
): Promise<ProviderResult | null> {
  if (!process.env.GROQ_API_KEY) return null;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...rawMessages.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(m.content || ''),
    })),
  ];

  const candidateModels = [...GROQ_SMART_MODELS, ...GROQ_FAST_MODELS];
  for (const model of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: groqMessages,
        temperature,
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) {
        return { text, provider: 'groq', model: `Groq (${model})` };
      }
    } catch (groqErr: unknown) {
      const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
      console.warn(`[API /ai/ask] Groq model ${model} failed:`, msg);
    }
  }
  return null;
}

async function tryGemini(
  systemPrompt: string,
  rawMessages: Array<{ role: string; content: string }>,
  temperature: number
): Promise<ProviderResult | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  for (const modelName of GEMINI_CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: { temperature },
      });

      const contents = rawMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
      }));

      const res = await model.generateContent({ contents });
      const text = res.response.text()?.trim();
      if (text) {
        return { text, provider: 'gemini', model: `Google Gemini (${modelName})` };
      }
    } catch (mErr: unknown) {
      const msg = mErr instanceof Error ? mErr.message : String(mErr);
      console.warn(`[API /ai/ask] Gemini model ${modelName} failed:`, msg);
    }
  }
  return null;
}

async function tryOpenRouter(
  systemPrompt: string,
  rawMessages: Array<{ role: string; content: string }>,
  temperature: number
): Promise<ProviderResult | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const orMessages = [
    { role: 'system', content: systemPrompt },
    ...rawMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
  ];

  for (const model of OPENROUTER_CANDIDATE_MODELS) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages: orMessages, temperature }),
      });

      if (orRes.ok) {
        const data = await orRes.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { text, provider: 'openrouter', model: `OpenRouter (${model})` };
        }
      }
    } catch (orErr: unknown) {
      const msg = orErr instanceof Error ? orErr.message : String(orErr);
      console.warn(`[API /ai/ask] OpenRouter model ${model} failed:`, msg);
    }
  }
  return null;
}

async function tryAgentRouter(
  systemPrompt: string,
  rawMessages: any[],
  temperature: number
): Promise<ProviderResult | null> {
  const apiKey = process.env.AGENTROUTER_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.to/v1').replace(/\/+$/, '');
  const endpoint = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

  const arMessages = [
    { role: 'system', content: systemPrompt },
    ...rawMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
  ];

  for (const model of AGENTROUTER_CANDIDATE_MODELS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages: arMessages, temperature }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { text, provider: 'agentrouter', model: `AgentRouter (${model})` };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[API /ai/ask] AgentRouter model ${model} notice:`, msg);
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = AskRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { payload } = parsed.data;
    const rawMessages =
      payload.messages && payload.messages.length > 0
        ? payload.messages
        : payload.prompt
          ? [{ role: 'user' as const, content: payload.prompt }]
          : [];

    if (rawMessages.length === 0) {
      return NextResponse.json({ error: 'Prompt or messages required' }, { status: 400 });
    }

    const latestUserQuestion =
      [...rawMessages].reverse().find((m) => m.role === 'user')?.content || '';

    let systemPrompt =
      payload.systemPrompt ||
      'You are an expert AI university tutor. Provide clear, highly readable, well-structured pedagogical explanations using markdown headers, bullet points, and LaTeX for math.';

    const isTutorFeature = parsed.data.feature === 'ai-tutor';

    // Fetch user settings and profile to personalize AI Tutor persona and tone
    let tutorName = payload.tutorName;
    let tutorPersonality = payload.tutorPersonality;
    let tutorTone = payload.tutorTone;
    let studentConfig: any = payload.studentConfig;
    let studentCourseContext = 'University Academic Studies';

    if (isTutorFeature) {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          supabase
            .from('user_settings')
            .select('ai_tutor_name, ai_personality, ai_tone, ai_reading_level, learning_style, language')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('full_name, username, tutor_name, tutor_personality, degree_programme, faculty')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        const settingsRow = settingsRes.data;
        const profileRow = profileRes.data;

        tutorName = tutorName || settingsRow?.ai_tutor_name || profileRow?.tutor_name || 'Alex';
        tutorPersonality = tutorPersonality || settingsRow?.ai_personality || profileRow?.tutor_personality || 'encouraging';
        tutorTone = tutorTone || settingsRow?.ai_tone || 'academic';

        if (profileRow?.degree_programme) {
          studentCourseContext = `${profileRow.degree_programme} (Faculty of ${profileRow.faculty || 'Academic Studies'})`;
        }

        studentConfig = studentConfig || {
          personality: tutorPersonality,
          readingLevel: settingsRow?.ai_reading_level || 'undergraduate',
          tone: tutorTone,
          learningStyle: settingsRow?.learning_style || 'active',
          language: settingsRow?.language || 'English',
        };
      } catch (err) {
        console.warn('[API /ai/ask] Failed to load tutor settings for personalization:', err);
      }
    }

    const groundingResult = payload.grounding
      ? TutorGroundingSchema.safeParse(payload.grounding)
      : null;

    let groundingSources: GroundingSource[] = [];
    let candidateSlides: any[] = [];
    let retrievedChunks: any[] = [];
    let grounding: TutorGroundingInput | null = null;

    if (groundingResult?.success) {
      grounding = groundingResult.data as TutorGroundingInput;
      candidateSlides = grounding.slides || [];
      if (candidateSlides.length === 0 && grounding.lectureId) {
        const { data: dbSlides } = await supabase
          .from('slides')
          .select('slide_number, raw_text, explanation')
          .eq('lecture_id', grounding.lectureId)
          .order('slide_number', { ascending: true })
          .limit(200);
        if (dbSlides && dbSlides.length > 0) {
          candidateSlides = dbSlides;
        }
      }

      retrievedChunks = retrieveRelevantSlideChunks(
        latestUserQuestion,
        candidateSlides,
        grounding.currentSlideNumber,
        4
      );

      groundingSources = candidateSlides
        .map((s, idx) => ({
          slideNumber: s.slide_number ?? idx + 1,
          text: `${s.raw_text || ''} ${s.explanation || ''}`.trim(),
        }))
        .filter((s) => s.text.length > 0);

      if (
        grounding.currentSlideNumber &&
        (grounding.currentSlideText || grounding.currentSlideExplanation)
      ) {
        groundingSources.push({
          slideNumber: grounding.currentSlideNumber,
          text: `${grounding.currentSlideText || ''} ${grounding.currentSlideExplanation || ''}`.trim(),
        });
      }
    }

    if (isTutorFeature) {
      systemPrompt = buildGroundedTutorPrompt({
        tutorName: tutorName || 'Alex',
        tutorPersonality: tutorPersonality || 'encouraging',
        courseContext: grounding?.courseContext || studentCourseContext,
        currentSlideNumber: grounding?.currentSlideNumber,
        currentSlideText: grounding?.currentSlideText,
        currentSlideExplanation: grounding?.currentSlideExplanation,
        retrievedChunks,
        studentConfig: studentConfig || { personality: tutorPersonality || 'encouraging', tone: tutorTone || 'academic' },
        commandMode: grounding?.commandMode ?? detectTutorCommandMode(latestUserQuestion),
      });
    }

    const temperature = payload.temperature ?? 0.55;
    const requestedModel = (payload.model || 'auto').toLowerCase();

    let providerResult: ProviderResult | null = null;

    // Route to user's explicitly requested model/provider first
    if (requestedModel.includes('agent') || requestedModel.includes('router')) {
      providerResult =
        (await tryAgentRouter(systemPrompt, rawMessages, temperature)) ||
        (await tryGroq(systemPrompt, rawMessages, temperature)) ||
        (await tryGemini(systemPrompt, rawMessages, temperature)) ||
        (await tryOpenRouter(systemPrompt, rawMessages, temperature));
    } else if (requestedModel.includes('gemini')) {
      providerResult =
        (await tryGemini(systemPrompt, rawMessages, temperature)) ||
        (await tryGroq(systemPrompt, rawMessages, temperature)) ||
        (await tryAgentRouter(systemPrompt, rawMessages, temperature)) ||
        (await tryOpenRouter(systemPrompt, rawMessages, temperature));
    } else if (requestedModel.includes('groq') || requestedModel === 'fast') {
      providerResult =
        (await tryGroq(systemPrompt, rawMessages, temperature)) ||
        (await tryGemini(systemPrompt, rawMessages, temperature)) ||
        (await tryAgentRouter(systemPrompt, rawMessages, temperature)) ||
        (await tryOpenRouter(systemPrompt, rawMessages, temperature));
    } else if (requestedModel.includes('openrouter') || requestedModel.includes('qwen')) {
      providerResult =
        (await tryOpenRouter(systemPrompt, rawMessages, temperature)) ||
        (await tryAgentRouter(systemPrompt, rawMessages, temperature)) ||
        (await tryGemini(systemPrompt, rawMessages, temperature)) ||
        (await tryGroq(systemPrompt, rawMessages, temperature));
    } else {
      // Default / Smart Auto order: Groq (low latency) -> Gemini (deep reasoning) -> AgentRouter -> OpenRouter
      providerResult =
        (await tryGroq(systemPrompt, rawMessages, temperature)) ||
        (await tryGemini(systemPrompt, rawMessages, temperature)) ||
        (await tryAgentRouter(systemPrompt, rawMessages, temperature)) ||
        (await tryOpenRouter(systemPrompt, rawMessages, temperature));
    }

    if (!providerResult || !providerResult.text) {
      return NextResponse.json(
        { error: 'Unable to reach AI providers right now. Please retry shortly.' },
        { status: 502 }
      );
    }

    let sanitizedReply = sanitizeTutorResponse(providerResult.text);
    const validSlideNumbers = groundingSources
      .map((s) => s.slideNumber)
      .filter((n): n is number => typeof n === 'number');
    if (validSlideNumbers.length > 0) {
      sanitizedReply = stripPhantomSlideCitations(sanitizedReply, validSlideNumbers);
    }
    const groundingReport =
      groundingSources.length > 0
        ? verifyResponseGrounding(sanitizedReply, groundingSources)
        : null;

    return NextResponse.json({
      result: {
        choices: [
          {
            message: {
              role: 'assistant',
              content: sanitizedReply,
            },
          },
        ],
      },
      grounding: groundingReport,
      provider: providerResult.provider,
      modelUsed: providerResult.model,
    });
  } catch (err: unknown) {
    console.error('API /ai/ask error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
