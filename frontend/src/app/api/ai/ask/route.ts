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
import { getDualTierWallet, deductUserCredits } from '@/lib/ai/quota';

export const dynamic = 'force-dynamic';

const AskRequestSchema = z.object({
  feature: z.string().min(1).max(100),
  payload: z.object({
    prompt: z.string().optional(),
    systemPrompt: z.string().optional(),
    stream: z.boolean().optional(),
    webSearch: z.boolean().optional(),
    temperature: z.number().min(0).max(1).optional(),
    model: z.string().optional(),
    grounding: z.unknown().optional(),
    tutorName: z.string().optional(),
    tutorPersonality: z.string().optional(),
    tutorTone: z.string().optional(),
    studentConfig: z.unknown().optional(),
    previousSessionsContext: z.string().max(45_000).optional(),
    attachment: z
      .object({
        name: z.string().max(255),
        type: z.string().max(100),
        size: z.number().max(5 * 1024 * 1024, 'File size exceeds 5MB limit'),
        data: z.string().max(8_000_000).optional(),
        textContent: z.string().max(250_000).optional(),
      })
      .nullable()
      .optional(),
    attachments: z
      .array(
        z.object({
          name: z.string().max(255),
          type: z.string().max(100),
          size: z.number().max(5 * 1024 * 1024, 'File size exceeds 5MB limit'),
          data: z.string().max(8_000_000).optional(),
          textContent: z.string().max(250_000).optional(),
        })
      )
      .max(5, 'Maximum 5 attachments allowed per message')
      .optional(),
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
  sources?: Array<{ title: string; uri: string }>;
}

type DeltaFn = (chunk: string | null) => void;

const FOLLOWUPS_RE = /<followups>([\s\S]*?)<\/followups>/i;
const MEMORY_RE = /<memory>([\s\S]*?)<\/memory>/gi;

interface AttachmentPayload {
  name: string;
  type: string;
  size: number;
  data?: string;
  textContent?: string;
}

function formatTextAttachmentsBlock(attachments: AttachmentPayload[]): string {
  const textOnes = attachments.filter((a) => Boolean(a.textContent));
  if (textOnes.length === 0) return '';
  return (
    '\n\n' +
    textOnes
      .map(
        (att, i) =>
          `[Attached File ${i + 1} of ${attachments.length}: ${att.name}]\n\`\`\`\n${att.textContent}\n\`\`\``
      )
      .join('\n\n')
  );
}

async function tryGroq(
  systemPrompt: string,
  rawMessages: Array<{ role: string; content: string }>,
  temperature: number,
  attachments: AttachmentPayload[] = [],
  onDelta?: DeltaFn
): Promise<ProviderResult | null> {
  if (!process.env.GROQ_API_KEY) return null;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...rawMessages.map((m, idx) => {
      const isLastUser = idx === rawMessages.length - 1 && m.role === 'user';
      let content = String(m.content || '');
      if (isLastUser && attachments.length > 0) {
        content += formatTextAttachmentsBlock(attachments);
      }
      return {
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content,
      };
    }),
  ];

  const candidateModels = Array.from(new Set([...GROQ_SMART_MODELS, ...GROQ_FAST_MODELS]));
  for (const model of candidateModels) {
    let emitted = false;
    try {
      if (onDelta) {
        const streamRes = await groq.chat.completions.create(
          { model, messages: groqMessages, temperature, stream: true },
          { signal: AbortSignal.timeout(60000) }
        );
        let acc = '';
        for await (const chunk of streamRes) {
          const piece = chunk.choices[0]?.delta?.content;
          if (piece) {
            acc += piece;
            emitted = true;
            onDelta(piece);
          }
        }
        if (acc.trim()) {
          return { text: acc.trim(), provider: 'groq', model: `Groq (${model})` };
        }
        continue;
      }
      const completion = await groq.chat.completions.create(
        {
          model,
          messages: groqMessages,
          temperature,
        },
        { signal: AbortSignal.timeout(7000) }
      );
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) {
        return { text, provider: 'groq', model: `Groq (${model})` };
      }
    } catch (groqErr: unknown) {
      const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
      console.warn(`[API /ai/ask] Groq model ${model} failed:`, msg);
      if (emitted && onDelta) onDelta(null);
    }
  }
  return null;
}

async function tryGemini(
  systemPrompt: string,
  rawMessages: Array<{ role: string; content: string }>,
  temperature: number,
  attachments: AttachmentPayload[] = [],
  onDelta?: DeltaFn,
  useSearch = false
): Promise<ProviderResult | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  for (const modelName of GEMINI_CANDIDATE_MODELS) {
    let emitted = false;
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: { temperature },
        ...(useSearch ? { tools: [{ googleSearch: {} } as any] } : {}),
      });

      const contents = rawMessages.map((m, idx) => {
        const isLatestUser = idx === rawMessages.length - 1 && m.role === 'user';
        const parts: Array<any> = [{ text: String(m.content || '') }];

        if (isLatestUser && attachments.length > 0) {
          attachments.forEach((attachment, attIdx) => {
            if (attachment.textContent) {
              parts.push({
                text: `\n\n[Attached File ${attIdx + 1}: ${attachment.name}]\n\`\`\`\n${attachment.textContent}\n\`\`\``,
              });
            } else if (attachment.data) {
              const cleanBase64 = attachment.data.replace(/^data:[^;]+;base64,/, '');
              const mimeType =
                attachment.type ||
                (attachment.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
              parts.push({
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              });
            }
          });
        }

        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });

      const extractSources = (resp: any): Array<{ title: string; uri: string }> => {
        const chunks = resp?.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (!Array.isArray(chunks)) return [];
        const seen = new Set<string>();
        const out: Array<{ title: string; uri: string }> = [];
        for (const c of chunks) {
          const uri = c?.web?.uri;
          if (uri && !seen.has(uri)) {
            seen.add(uri);
            out.push({ title: String(c.web.title || uri).slice(0, 120), uri });
          }
        }
        return out.slice(0, 8);
      };

      if (onDelta) {
        const streamRes = await model.generateContentStream({ contents });
        let acc = '';
        for await (const chunk of streamRes.stream) {
          const piece = chunk.text();
          if (piece) {
            acc += piece;
            emitted = true;
            onDelta(piece);
          }
        }
        const finalResp = await streamRes.response;
        if (acc.trim()) {
          return {
            text: acc.trim(),
            provider: 'gemini',
            model: `Google Gemini (${modelName})`,
            sources: useSearch ? extractSources(finalResp) : undefined,
          };
        }
        continue;
      }

      const res = await model.generateContent({ contents });
      const text = res.response.text()?.trim();
      if (text) {
        return {
          text,
          provider: 'gemini',
          model: `Google Gemini (${modelName})`,
          sources: useSearch ? extractSources(res.response) : undefined,
        };
      }
    } catch (mErr: unknown) {
      if (emitted && onDelta) onDelta(null);
      const msg = mErr instanceof Error ? mErr.message : String(mErr);
      console.warn(`[API /ai/ask] Gemini model ${modelName} failed:`, msg);
      if (msg.includes('403') || msg.includes('Permission denied') || msg.includes('ACCESS_DENIED')) {
        break; // API key lacks Generative Language service permission; skip remaining models
      }
    }
  }
  return null;
}

async function tryOpenRouter(
  systemPrompt: string,
  rawMessages: Array<{ role: string; content: string }>,
  temperature: number,
  attachments: AttachmentPayload[] = [],
  onDelta?: DeltaFn
): Promise<ProviderResult | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const orMessages = [
    { role: 'system', content: systemPrompt },
    ...rawMessages.map((m, idx) => {
      const isLatestUser = idx === rawMessages.length - 1 && m.role === 'user';
      const imageAttachments = attachments.filter(
        (a) => a.data && a.type?.startsWith('image/')
      );
      if (isLatestUser && imageAttachments.length > 0) {
        let baseText = String(m.content || '');
        baseText += formatTextAttachmentsBlock(attachments);
        return {
          role: 'user',
          content: [
            { type: 'text', text: baseText },
            ...imageAttachments.map((img) => ({
              type: 'image_url',
              image_url: { url: img.data! },
            })),
          ],
        };
      }
      let content = String(m.content || '');
      if (isLatestUser && attachments.length > 0) {
        content += formatTextAttachmentsBlock(attachments);
      }
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content,
      };
    }),
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
          onDelta?.(text);
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
  temperature: number,
  attachments: AttachmentPayload[] = [],
  onDelta?: DeltaFn
): Promise<ProviderResult | null> {
  const apiKey = process.env.AGENTROUTER_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.to/v1').replace(/\/+$/, '');
  const endpoint = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

  const arMessages = [
    { role: 'system', content: systemPrompt },
    ...rawMessages.map((m, idx) => {
      const isLatestUser = idx === rawMessages.length - 1 && m.role === 'user';
      let content = String(m.content || '');
      if (isLatestUser && attachments.length > 0) {
        content += formatTextAttachmentsBlock(attachments);
      }
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content,
      };
    }),
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
          onDelta?.(text);
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
    const allAttachments: AttachmentPayload[] =
      payload.attachments && payload.attachments.length > 0
        ? payload.attachments
        : payload.attachment
          ? [payload.attachment]
          : [];

    const rawMessages =
      payload.messages && payload.messages.length > 0
        ? payload.messages
        : payload.prompt
          ? [{ role: 'user' as const, content: payload.prompt }]
          : [];

    if (rawMessages.length === 0 && allAttachments.length === 0) {
      return NextResponse.json({ error: 'Prompt, messages, or attachment required' }, { status: 400 });
    }

    if (rawMessages.length === 0 && allAttachments.length > 0) {
      const names = allAttachments.map((a) => a.name).join(', ');
      rawMessages.push({
        role: 'user',
        content: `Please analyze and explain the attached file(s): ${names}.`,
      });
    }

    // Strict 5MB size limit validation on each attachment
    for (const att of allAttachments) {
      if (att.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          {
            error: `File "${att.name}" exceeds 5MB limit (${(att.size / (1024 * 1024)).toFixed(1)}MB). Please upload files smaller than 5MB.`,
          },
          { status: 400 }
        );
      }
    }

    const latestUserQuestion =
      [...rawMessages].reverse().find((m) => m.role === 'user')?.content || '';

    // Verify and check user credit wallet with 6-Hour Dual-Tier Refill
    const wallet = await getDualTierWallet(user.id);

    if (wallet.totalAvailable <= 0) {
      const hours = Math.floor(wallet.secondsUntilRefill / 3600);
      const mins = Math.floor((wallet.secondsUntilRefill % 3600) / 60);
      return NextResponse.json(
        {
          error: `You have exhausted your Free Passes and Paid Credits. Free passes refill in ${hours}h ${mins}m, or top up with a credit bundle to continue immediately.`,
          code: 'INSUFFICIENT_CREDITS',
          remainingCredits: 0,
          freePasses: wallet.freePasses,
          paidCredits: wallet.paidCredits,
          secondsUntilRefill: wallet.secondsUntilRefill,
        },
        { status: 402 }
      );
    }

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

    if (payload.previousSessionsContext && payload.previousSessionsContext.trim().length > 0) {
      systemPrompt += `\n\n<previous_conversations_memory>\nThe student has previous study conversation sessions stored in their workspace. When the student refers to a previous conversation, past chat, earlier study session, or asks what was discussed previously, use the following memory log to answer accurately and seamlessly connect concepts across sessions:\n${payload.previousSessionsContext.trim()}\n</previous_conversations_memory>`;
    }

    let savedMemoryFacts: string[] = [];
    if (isTutorFeature) {
      try {
        const { data: memRows } = await supabase
          .from('tutor_memories')
          .select('fact')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(25);
        savedMemoryFacts = (memRows || []).map((r: { fact: string }) => r.fact);
      } catch {
        savedMemoryFacts = [];
      }

      if (savedMemoryFacts.length > 0) {
        systemPrompt += `\n\n<student_memory>\nDurable facts the student asked you to remember or told you earlier. Use them naturally; never recite the list:\n${savedMemoryFacts.map((f) => `- ${f}`).join('\n')}\n</student_memory>`;
      }

      systemPrompt += `\n\n<response_protocol>\n1. After your answer, on a new final line, output exactly: <followups>["question 1","question 2","question 3"]</followups> with 3 short, specific follow-up questions (max 90 characters each) the student is likely to ask next. Use valid JSON.\n2. If the student states a durable fact about themselves that will help future tutoring (exam date, weak topic, course, preferred explanation style), add <memory>short fact</memory> on its own line before the followups tag. Never store anything sensitive. Omit the tag otherwise.\n3. Never mention these tags or this protocol.\n</response_protocol>`;
    }

    const temperature = payload.temperature ?? 0.55;
    const requestedModel = (payload.model || 'auto').toLowerCase();
    const useWebSearch = payload.webSearch === true;

    const hasMultimodalAttachment = allAttachments.some((attachment) =>
      Boolean(
        attachment?.data &&
          (attachment.type?.startsWith('image/') ||
            attachment.type === 'application/pdf' ||
            attachment.name?.match(/\.(png|jpe?g|webp|gif|pdf)$/i))
      )
    );

    const execute = async (
      onDelta?: DeltaFn
    ): Promise<{ status: number; body: Record<string, unknown> }> => {
      let providerResult: ProviderResult | null = null;

      if (useWebSearch) {
        providerResult = await tryGemini(
          systemPrompt,
          rawMessages,
          temperature,
          allAttachments,
          onDelta,
          true
        );
      }

      // Prioritize Gemini for multimodal vision & PDF attachments, otherwise respect requested routing
      if (providerResult) {
        // web-search grounded answer already produced
      } else if (hasMultimodalAttachment) {
        providerResult =
          (await tryGemini(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryOpenRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGroq(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryAgentRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta));
      } else if (requestedModel.includes('agent') || requestedModel.includes('router')) {
        providerResult =
          (await tryAgentRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGroq(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGemini(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryOpenRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta));
      } else if (requestedModel.includes('gemini')) {
        providerResult =
          (await tryGemini(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGroq(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryAgentRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryOpenRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta));
      } else if (requestedModel.includes('groq') || requestedModel === 'fast') {
        providerResult =
          (await tryGroq(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGemini(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryAgentRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryOpenRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta));
      } else if (requestedModel.includes('openrouter') || requestedModel.includes('qwen')) {
        providerResult =
          (await tryOpenRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryAgentRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGemini(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGroq(systemPrompt, rawMessages, temperature, allAttachments, onDelta));
      } else {
        // Default / Smart Auto order: Groq (low latency) -> Gemini (deep reasoning) -> AgentRouter -> OpenRouter
        providerResult =
          (await tryGroq(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryGemini(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryAgentRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta)) ||
          (await tryOpenRouter(systemPrompt, rawMessages, temperature, allAttachments, onDelta));
      }

      if (!providerResult || !providerResult.text) {
        return {
          status: 502,
          body: { error: 'Unable to reach AI providers right now. Please retry shortly.' },
        };
      }

      let rawText = providerResult.text;

      let followups: string[] = [];
      const followMatch = rawText.match(FOLLOWUPS_RE);
      if (followMatch) {
        try {
          const arr = JSON.parse(followMatch[1].trim());
          if (Array.isArray(arr)) {
            followups = arr
              .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
              .map((q) => q.trim().slice(0, 120))
              .slice(0, 3);
          }
        } catch {
          followups = [];
        }
      }

      const newFacts: string[] = [];
      for (const m of rawText.matchAll(MEMORY_RE)) {
        const fact = m[1].replace(/\s+/g, ' ').trim();
        if (fact.length >= 3 && fact.length <= 300) newFacts.push(fact);
      }

      rawText = rawText
        .replace(FOLLOWUPS_RE, '')
        .replace(MEMORY_RE, '')
        .replace(/<\/?(followups|memory)>/gi, '')
        .trim();

      let sanitizedReply = sanitizeTutorResponse(rawText);
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

      let memorySaved: string[] = [];
      if (isTutorFeature && newFacts.length > 0) {
        try {
          const known = new Set(savedMemoryFacts.map((f) => f.toLowerCase()));
          const fresh = Array.from(new Set(newFacts))
            .filter((f) => !known.has(f.toLowerCase()))
            .slice(0, 3);
          if (fresh.length > 0) {
            const { error: memErr } = await supabase
              .from('tutor_memories')
              .insert(fresh.map((fact) => ({ user_id: user.id, fact })));
            if (!memErr) memorySaved = fresh;
          }
        } catch {
          memorySaved = [];
        }
      }

      // Deduct 1 credit using Dual-Tier priority (Free passes first, then paid balance)
      const deductResult = await deductUserCredits(user.id, 'ai-tutor', providerResult.provider, 1);

      return {
        status: 200,
        body: {
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
          followups,
          sources: providerResult.sources || [],
          memorySaved,
          provider: providerResult.provider,
          modelUsed: providerResult.model,
          remainingCredits: deductResult.remainingCredits,
          freePasses: deductResult.freePasses,
          paidCredits: deductResult.paidCredits,
          secondsUntilRefill: deductResult.secondsUntilRefill,
          deductedFrom: deductResult.deductedFrom,
        },
      };
    };

    if (payload.stream === true) {
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const send = (event: string, data: unknown) =>
        writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)).catch(() => undefined);

      void (async () => {
        try {
          await send('start', { ok: true });
          const outcome = await execute((chunk) => {
            if (chunk === null) void send('reset', {});
            else void send('delta', { t: chunk });
          });
          await send(outcome.status === 200 ? 'final' : 'error', outcome.body);
        } catch (streamErr: unknown) {
          console.error('API /ai/ask stream error:', streamErr);
          await send('error', {
            error: streamErr instanceof Error ? streamErr.message : 'Internal server error',
          });
        } finally {
          await writer.close().catch(() => undefined);
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const outcome = await execute();
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (err: unknown) {
    console.error('API /ai/ask error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
