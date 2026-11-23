import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { protectExpensiveEndpoint, deduplicateInFlightRequests } from '../middleware/expensiveGuard';
import { withAIQuota } from '../middleware/quotaGuard';
import { routeRequest, AIRequest } from '../lib/ai/router';
import { consumeUserQuota, checkUserQuota } from '../lib/ai/quota';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

router.use(authenticateUser);
router.use(rateLimit);
router.use(protectExpensiveEndpoint({ maxPerMinute: 12, maxConcurrent: 2 }));
router.use(deduplicateInFlightRequests({ methods: ['GET', 'POST'] }));

import multer from 'multer';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { compile, derivative, evaluate, format, lusolve, simplify } from 'mathjs';
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  MISTRAL_VISION_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../shared/constants/aiModels';
import {
  TutorGroundingSchema,
  buildGroundedTutorPrompt,
  detectTutorCommandMode,
  retrieveRelevantSlideChunks,
  sanitizeTutorResponse,
} from '../../../shared/lib/aiTutor';
import {
  stripPhantomSlideCitations,
  type GroundingSource,
} from '../../../shared/lib/groundingVerifier';
import { normalizeLatexMarkdown } from '../../../shared/lib/latexNormalizer';
import {
  buildMathOcrPrompt,
  cleanExtractedMathText,
  extractRawBase64AndMime,
  normalizeVisionMime,
  sanitizeMathResponse,
  tryDeterministicMathSolve,
} from '../../../shared/lib/mathSolver';

const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_VISION_MODELS = [...GEMINI_CANDIDATE_MODELS];

async function callWithFallback(
  genAI: GoogleGenerativeAI,
  models: string[],
  buildRequest: (model: any) => Promise<any>
): Promise<any> {
  let lastErr: any;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await buildRequest(model);
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || '';
      const status = err?.status;
      const isTransientError = 
        msg.includes('503') || msg.includes('unavailable') || status === 503 ||
        msg.includes('429') || msg.includes('too many requests') || msg.includes('quota') || status === 429 ||
        msg.includes('404') || msg.includes('not found') || status === 404 ||
        msg.includes('403') || msg.includes('forbidden') || status === 403;

      if (isTransientError) {
        lastErr = err;
        continue; // try next model
      }
      throw err; // unrecoverable — surface immediately
    }
  }
  throw lastErr;
}

router.post('/search-math', withAIQuota('answer_improver'), async (req: Request, res: Response) => {
  try {
    const { type, query } = req.body;
    if (!type || !query) return res.status(400).json({ error: 'Missing type or query' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const prompt = type === 'formula'
      ? `You are a scientific math assistant. The user is searching for a formula related to: "${query}".
         Return EXACTLY ONE JSON object (and nothing else) with these keys: 
         "name" (string), "formula" (string, standard notation), "subject" (string, e.g. Physics, Calculus, Algebra).`
      : `You are a scientific math assistant. The user is searching for a scientific constant related to: "${query}".
         Return EXACTLY ONE JSON object (and nothing else) with these keys: 
         "name" (string), "symbol" (string), "value" (string, scientific notation is okay), "unit" (string), "subject" (string).`;

    const result = await callWithFallback(genAI, GEMINI_VISION_MODELS, async (model) => {
      const response = await model.generateContent(prompt);
      return response.response.text();
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON");
    
    res.json({ success: true, data: JSON.parse(jsonMatch[0]) });
  } catch (err: any) {
    console.error('Math AI search error:', err);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

router.post('/scan-notes', upload.single('file'), withAIQuota('handwriting_scan'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image uploaded' });
    if (!file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Please upload a valid image' });

    const base64Image = file.buffer.toString('base64');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const prompt = `
      You are an expert transcriber and academic assistant.
      The attached image contains handwritten (or typed) study notes.
      Please transcribe the notes precisely.
      Format the transcribed notes in clean Markdown.
      Use appropriate headings (H2, H3), bullet points, and bold text for emphasis.
      CRITICAL: For mathematical expressions, you MUST use $ for inline math (e.g. $x^2$) and $$ for block math equations (e.g. $$y = mx + b$$). DO NOT use \\( \\) or \\[ \\].
      If there are diagrams, describe them briefly.
      Do not add external information, just transcribe and format what is in the image.
    `;

    let transcription: string;
    try {
      const result = await callWithFallback(genAI, GEMINI_VISION_MODELS, model =>
        model.generateContent([
          prompt,
          { inlineData: { data: base64Image, mimeType: file!.mimetype } },
        ])
      );
      transcription = result.response.text();
    } catch (geminiErr: any) {
      console.warn('Gemini vision models failed, falling back to OpenRouter:', geminiErr.message);
      
      const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENROUTER_CANDIDATE_MODELS[0],
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${file!.mimetype};base64,${base64Image}` } }
              ]
            }
          ]
        })
      });
      
      const fallbackData = await fallbackRes.json();
      if (!fallbackRes.ok) throw new Error(fallbackData.error?.message || 'OpenRouter vision request failed');
      transcription = fallbackData.choices[0]?.message?.content || '';
      if (!transcription) throw new Error('OpenRouter returned empty response');
    }

    const cleanTranscription = normalizeLatexMarkdown(transcription);

    consumeUserQuota(req.user!.id, 'handwriting_scan', req.body?.model_tier || req.headers?.['x-model-tier'] || 'default').catch(console.error);
    res.json({ transcription: cleanTranscription });
  } catch (err: any) {
    console.error('Notes Scanner Error:', err);
    const msg = err?.message?.toLowerCase() || '';
    const isTransientError = msg.includes('503') || msg.includes('unavailable') || msg.includes('429') || msg.includes('too many requests') || msg.includes('quota');
    
    res.status(isTransientError ? 429 : 500).json({
      error: isTransientError
        ? 'The AI service is currently experiencing high demand or rate limits. Please try again in a moment.'
        : err.message,
    });
  }
});

router.post('/ocr-math', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let base64Data = '';
    let effectiveMime = 'image/jpeg';
    const rawMode = String(req.body?.mode || 'math').trim();
    const mode: 'math' | 'graph' = rawMode === 'graph' ? 'graph' : 'math';

    if (req.file) {
      base64Data = req.file.buffer.toString('base64');
      effectiveMime = normalizeVisionMime(req.file.mimetype);
    } else if (typeof req.body?.imageBase64 === 'string' && req.body.imageBase64.trim()) {
      const parsed = extractRawBase64AndMime(req.body.imageBase64, req.body?.mimeType);
      base64Data = parsed.data;
      effectiveMime = parsed.mimeType;
    }

    if (!base64Data) {
      return res.status(400).json({ error: 'Please provide an image to extract mathematical text.' });
    }

    const ocrPrompt = buildMathOcrPrompt(mode);
    const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
    let extractedText = '';
    let providerUsed = '';

    // 1. Mistral Vision (ministral-14b-latest / ministral-8b-latest)
    if (!extractedText && process.env.MISTRAL_API_KEY) {
      for (const model of MISTRAL_VISION_MODELS) {
        try {
          const mRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            headers: {
              Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              temperature: 0.1,
              max_tokens: 1800,
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
          if (mRes.ok) {
            const mData = await mRes.json();
            const content = mData.choices?.[0]?.message?.content?.trim();
            if (content) {
              extractedText = cleanExtractedMathText(content);
              providerUsed = `mistral:${model}`;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[Backend OcrMath] Mistral ${model} failed:`, err?.message || err);
        }
      }
    }

    // 2. OpenRouter Vision (google/gemini-2.5-flash-lite & google/gemini-2.5-flash)
    if (!extractedText && process.env.OPENROUTER_API_KEY) {
      for (const model of OPENROUTER_CANDIDATE_MODELS) {
        try {
          const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              temperature: 0.1,
              max_tokens: 1500,
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
          if (orRes.ok) {
            const orData = await orRes.json();
            const content = orData.choices?.[0]?.message?.content?.trim();
            if (content) {
              extractedText = cleanExtractedMathText(content);
              providerUsed = `openrouter:${model}`;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[Backend OcrMath] OpenRouter ${model} failed:`, err?.message || err);
        }
      }
    }

    // 3. Direct Google Gemini Vision fallback
    if (!extractedText && process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.1, maxOutputTokens: 1800 },
          });
          const result = await model.generateContent([
            ocrPrompt,
            { inlineData: { data: base64Data, mimeType: effectiveMime } },
          ]);
          const text = result.response.text()?.trim();
          if (text) {
            extractedText = cleanExtractedMathText(text);
            providerUsed = `gemini:${modelName}`;
            break;
          }
        } catch (err: any) {
          console.warn(`[Backend OcrMath] Gemini ${modelName} failed:`, err?.message || err);
        }
      }
    }

    if (!extractedText) {
      return res.status(422).json({
        error: 'Could not extract mathematical text from image. Please ensure the image is clear and well-lit.',
      });
    }

    return res.json({
      success: true,
      extractedText,
      provider: providerUsed,
    });
  } catch (err: any) {
    console.error('[Backend OcrMath] Error:', err);
    return res.status(500).json({ error: 'Failed to extract mathematical text from image' });
  }
});

router.post('/ask', async (req: Request, res: Response) => {
  const { feature, payload, priority, identifiers } = req.body;
  if (!feature || !payload) return res.status(400).json({ error: 'Missing feature or payload' });

  // Manually check quota
  const modelTier = req.body?.model_tier || req.headers?.['x-model-tier'] || 'default';
  const hasQuota = await checkUserQuota(req.user!.id, feature as any, modelTier as any);
  if (!hasQuota.allowed) {
    return res.status(429).json({ error: 'Insufficient credits or quota', details: hasQuota.reason });
  }
  
  // Fetch user settings
  let userSettings: any = null;
  let userProfile: any = null;
  try {
    const { supabaseAsUser } = await import('../lib/supabase');
    const supabase = supabaseAsUser(req.user!.jwt);
    const [settingsRes, profileRes] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', req.user!.id).maybeSingle(),
      supabase.from('profiles').select('tutor_name, tutor_personality, degree_programme, faculty').eq('id', req.user!.id).maybeSingle(),
    ]);
    if (settingsRes.data) userSettings = settingsRes.data;
    if (profileRes.data) userProfile = profileRes.data;
  } catch (err) {
    console.error('Failed to fetch user settings for AI:', err);
  }

  const parsedGrounding = payload.grounding
    ? TutorGroundingSchema.safeParse(payload.grounding)
    : null;

  let enrichedPayload = {
    ...payload,
    temperature: payload.temperature ?? (feature === 'chat_message' ? 0.55 : undefined),
  };

  const isTutorRequest = feature === 'chat_message' || feature === 'ai-tutor';
  const resolvedTutorName = payload.tutorName || userSettings?.ai_tutor_name || userProfile?.tutor_name || 'Alex';
  const resolvedTutorPersonality = payload.tutorPersonality || userSettings?.ai_personality || userProfile?.tutor_personality || 'encouraging';
  const resolvedTutorTone = payload.tutorTone || userSettings?.ai_tone || 'academic';

  const defaultStudentConfig = {
    personality: resolvedTutorPersonality,
    readingLevel: userSettings?.ai_reading_level || 'undergraduate',
    tone: resolvedTutorTone,
    learningStyle: userSettings?.learning_style || 'active',
    language: userSettings?.language || 'English',
  };

  let groundingSources: GroundingSource[] = [];
  if (parsedGrounding?.success) {
    const g = parsedGrounding.data;
    const rawMsgs = Array.isArray(payload.messages) ? payload.messages : [];
    const latestQ =
      [...rawMsgs].reverse().find((m: any) => m?.role === 'user')?.content ||
      payload.prompt ||
      '';
    const chunks = retrieveRelevantSlideChunks(
      String(latestQ),
      g.slides || [],
      g.currentSlideNumber,
      4
    );
    groundingSources = (g.slides || [])
      .map((s, idx) => ({
        slideNumber: s.slide_number ?? idx + 1,
        text: `${s.raw_text || ''} ${s.explanation || ''}`.trim(),
      }))
      .filter((s) => s.text.length > 0);
    enrichedPayload = {
      ...enrichedPayload,
      systemPrompt: buildGroundedTutorPrompt({
        tutorName: resolvedTutorName,
        tutorPersonality: resolvedTutorPersonality,
        courseContext: g.courseContext,
        currentSlideNumber: g.currentSlideNumber,
        currentSlideText: g.currentSlideText,
        currentSlideExplanation: g.currentSlideExplanation,
        retrievedChunks: chunks,
        studentConfig: g.studentConfig ?? defaultStudentConfig,
        commandMode: g.commandMode ?? detectTutorCommandMode(String(latestQ)),
      }),
    };
  } else if (isTutorRequest) {
    const rawMsgs = Array.isArray(payload.messages) ? payload.messages : [];
    const latestQ =
      [...rawMsgs].reverse().find((m: any) => m?.role === 'user')?.content ||
      payload.prompt ||
      '';
    const courseContext = userProfile?.degree_programme
      ? `${userProfile.degree_programme} · Faculty of ${userProfile.faculty || 'Academic Studies'}`
      : 'University Degree Studies';

    enrichedPayload = {
      ...enrichedPayload,
      systemPrompt: buildGroundedTutorPrompt({
        tutorName: resolvedTutorName,
        tutorPersonality: resolvedTutorPersonality,
        courseContext,
        retrievedChunks: [],
        studentConfig: defaultStudentConfig,
        commandMode: detectTutorCommandMode(String(latestQ)),
      }),
    };
  }

  const aiReq: AIRequest = {
    task: payload.stream ? 'streaming' : 'batch_text',
    feature,
    payload: enrichedPayload,
    userSettings,
    userId: req.user!.id,
    priority: priority || 'medium',
    identifiers
  };

  try {
    const response = await routeRequest(aiReq);
    
    // Deduct quota asynchronously
    consumeUserQuota(aiReq.userId, aiReq.feature, req.body?.model_tier || req.headers?.['x-model-tier'] || 'default').catch(console.error);
    
    // For streaming like the calculator feature, the provider might return a stream object
    if (payload.stream && response.result?.tee) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      for await (const chunk of response.result) {
        res.write(`data: ${JSON.stringify(chunk.choices[0]?.delta || {})}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    if (feature === 'chat_message' && response.result) {
      const validSlides = groundingSources
        .map((s) => s.slideNumber)
        .filter((n): n is number => typeof n === 'number');
      const cleanTutorText = (raw: string) => {
        const cleaned = sanitizeTutorResponse(raw);
        return validSlides.length > 0
          ? stripPhantomSlideCitations(cleaned, validSlides)
          : cleaned;
      };
      if (typeof response.result === 'string') {
        response.result = cleanTutorText(response.result);
      } else if (response.result?.choices?.[0]?.message?.content) {
        response.result.choices[0].message.content = cleanTutorText(
          String(response.result.choices[0].message.content)
        );
      }
    }

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

// For specific routes that use the middleware strictly:
router.post('/calculator', withAIQuota('calculator'), async (req: Request, res: Response) => {
  const { problem = '', subject = 'Mathematics', level = 'Undergraduate' } = req.body || {};
  if (!String(problem).trim()) {
    return res.status(400).json({ error: 'Problem text is required' });
  }

  const aiReq: AIRequest = {
    task: 'streaming',
    feature: 'calculator',
    payload: { prompt: String(problem), subject, level, stream: true },
    userId: req.user!.id,
    priority: 'high'
  };

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    try {
      const response = await routeRequest(aiReq);
      consumeUserQuota(aiReq.userId, aiReq.feature, req.body?.model_tier || req.headers?.['x-model-tier'] || 'default').catch(console.error);

      if (typeof response.result === 'string') {
        fullText = response.result;
        res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`);
      } else if (response.result && Symbol.asyncIterator in response.result) {
        for await (const chunk of response.result) {
          const delta = chunk?.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
          }
        }
      }
    } catch (providerErr) {
      console.warn('[Backend /calculator] Provider failed, trying CAS fallback:', providerErr);
      const cas = tryDeterministicMathSolve(String(problem), {
        compile,
        derivative,
        evaluate,
        format,
        lusolve,
        simplify,
      });
      if (cas) {
        fullText = cas.markdown;
        res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`);
      } else {
        try {
          const cleaned = String(problem)
            .replace(/^(?:calculate|evaluate|what\s+is|solve|find|compute)\s+/i, '')
            .replace(/[?=]+$/, '')
            .trim();
          const evalResult = evaluate(cleaned);
          if (evalResult !== undefined && evalResult !== null) {
            const formattedResult = format(evalResult, { precision: 12 });
            fullText = `### Computed Result\n\n$$\n${cleaned} = ${formattedResult}\n$$\n\n**Answer:** **${formattedResult}**`;
            res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`);
          } else {
            fullText = `### Problem\n\n**Question:** ${String(problem).trim()}\n\nAI computation providers were unreachable or timed out. Please enter algebraic expressions (e.g., \`2x + 5 = 15\` or \`derivative of x^2\`) for immediate verified step-by-step computation.`;
            res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`);
          }
        } catch {
          fullText = `### Problem\n\n**Question:** ${String(problem).trim()}\n\nAI computation providers were unreachable or timed out. Please enter algebraic expressions (e.g., \`2x + 5 = 15\` or \`derivative of x^2\`) for immediate verified step-by-step computation.`;
          res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`);
        }
      }
    }

    if (fullText.trim()) {
      res.write(`data: ${JSON.stringify({ finalText: sanitizeMathResponse(fullText) })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Empty response from solver' })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
    res.write(`data: ${JSON.stringify({ error: 'Failed to solve mathematical problem' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

router.post('/explain', authenticateUser, withAIQuota('slide_explanation'), async (req: Request, res: Response) => {
  try {
  const { slideText, slideNumber, level, courseContext, visionExplanation, imageUrl, mode, prevSlideText, nextSlideText } = req.body;

  // Sanitize fallback error strings so they don't corrupt the prompt
  const cleanSlideText = (slideText && slideText !== 'Text extraction failed.') ? slideText : '';
  const cleanVisionEx = (visionExplanation && visionExplanation !== 'Explanation pending.') ? visionExplanation : '';

  let levelPrompt = 'standard university level';
  if (level === 'ELI5') levelPrompt = 'a high school student with no prior knowledge (ELI5). Use simple analogies.';
  if (level === 'Med') levelPrompt = 'a typical undergraduate student taking this module. Focus on core concepts.';
  if (level === 'Expert') levelPrompt = 'an expert level. Dive deep into the technical nuances, advanced terminology, and underlying mechanisms.';

  let tutorName = "Uni";
  let tutorPersonality = "neutral";
  let tone = "academic";
  let language = "en";
  let readingLevel = "intermediate";

  const { supabaseAsUser } = await import('../lib/supabase');
  const supabase = supabaseAsUser(req.user!.jwt);
  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', req.user!.id).single();
  
  if (settings) {
    if (settings.ai_tutor_name) tutorName = settings.ai_tutor_name;
    if (settings.ai_personality) tutorPersonality = settings.ai_personality;
    if (settings.ai_tone) tone = settings.ai_tone;
    if (settings.language) language = settings.language;
    if (settings.ai_reading_level) readingLevel = settings.ai_reading_level;
  }

  const systemPrompt = `You are an expert university AI tutor named ${tutorName}. You are known for being ${tutorPersonality}.`;

  const prompt = `
You are an expert university AI tutor named ${tutorName}. You are known for being ${tutorPersonality}.
The student is studying the course: "${courseContext}".
${slideNumber ? `You are currently explaining SLIDE ${slideNumber}.` : ''}

${mode === 'story' 
  ? 'Your task is to explain the following slide content to them by rewriting the concept as a short, engaging narrative story. Characters should represent variables or concepts, conflicts represent opposing forces, and the resolution represents the solution. Do not include a standard academic explanation; only tell the story.'
  : mode === 'conceptual'
  ? 'Your task is to explain the following theory, definitions, diagrams, or descriptive content from the slide. Start with a real-world analogy the student will recognise. Give the academic definition after the analogy. Explain WHY the concept exists — what problem it solves. Give one concrete example. End with exam-likely phrasing of the concept.'
  : 'Your task is to explain the following slide content to them.'}

CRITICAL SLIDE FOCUS DIRECTIVE:
Your explanation MUST concentrate strictly and solely on the specific content, bullet points, formulas, and diagrams presented on THIS slide (Slide ${slideNumber || 'current'}).
Do NOT give a generic course introduction if this slide covers specific objectives or topics.
Do NOT bleed into or summarize concepts that belong to other slides.

Accessibility Overrides for this user:
- Reading Complexity: ${readingLevel}
- Tone: ${tone}
- Language: You MUST respond in this language code: ${language}.

${cleanSlideText ? `Slide Content (Extracted Text):\n"${cleanSlideText}"` : ''}

${(cleanSlideText && cleanSlideText.split(' ').length < 20 && !cleanVisionEx && !imageUrl) ? `
**GAP FILLER MODE TRIGGERED**:
The text on this slide is extremely sparse (under 20 words) and no image is available. You must infer what the missing content should be based on the surrounding context.
Previous Slide Text: "${prevSlideText || 'None available'}"
Next Slide Text: "${nextSlideText || 'None available'}"

Write a dedicated section at the bottom of your explanation titled "### Gap Fill". In this section, provide the detailed content, context, and steps that are implied but missing from the sparse slide text. Use the surrounding slides to deduce what the lecturer meant to explain here.
` : ''}

${cleanVisionEx ? `Visual Context & Details (from AI Vision Model viewing the slide image):
"${cleanVisionEx}"
Use this visual context to enrich your explanation if it mentions charts, diagrams, or pictures.` : ''}

Format your response in clean Markdown. For mathematical expressions, use $ for inline math and $$ for block math equations. Do not use HTML tags. 
Provide a clear, engaging explanation adapted to their Reading Complexity. Highlight key terms using markdown bold (**term**).
Keep it concise enough to fit in a sidebar pane (max 300 words).

CRITICAL COPY CONSTRAINTS (Human Voice Only):
- DO NOT use AI filler words (e.g., delve, robust, seamless, leverage, journey, "in today's fast-paced world", "supercharge", "elevate").
- DO NOT use rhetorical questions (e.g., "Ready to dive in?").
- DO NOT use exclamation marks.
- DO NOT use em-dashes ("—" or "--"). Use commas or separate sentences instead.
- DO NOT use rule-of-three adjective stacks (e.g., "fast, reliable, and secure").
- Write like a smart, knowledgeable human explaining a concept to a friend. Use verbs over nouns, concrete over abstract.
- Do not introduce yourself, do not apologize, and do not say "Here is an explanation." Just start the explanation immediately.
`;

  try {
    const parts: any[] = [{ text: prompt }];

    if (imageUrl && imageUrl !== 'https://example.com/placeholder.png') {
      try {
        const imageRes = await fetch(imageUrl);
        if (imageRes.ok) {
          const arrayBuffer = await imageRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          let mimeType = imageRes.headers.get('content-type') || 'image/png';
          mimeType = mimeType.split(';')[0];
          parts.push({
            inlineData: {
              data: base64,
              mimeType: mimeType
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch image for Gemini vision processing:", err);
      }
    }

    // Send SSE headers immediately so the browser receives an instant connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    let fullText = '';

    // Fast-path 1: Stream from Groq (ultra-low latency ~200ms) using slide text and vision context
    if (process.env.GROQ_API_KEY && (cleanSlideText || cleanVisionEx)) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const groqStream = await groq.chat.completions.create({
          model: GROQ_SMART_MODELS[0] || 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: true,
          temperature: 0.5,
        });

        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            res.write(`data: ${JSON.stringify(delta)}\n\n`);
          }
        }
      } catch (groqFastErr) {
        console.warn('[AI Explain] Groq fast-path notice, trying next provider:', groqFastErr);
      }
    }

    // Path 2: If Groq didn't yield text, stream from Gemini Vision
    if (!fullText && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        for (const modelName of GEMINI_VISION_MODELS) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const streamResult = await model.generateContentStream({ contents: [{ role: 'user', parts }] });
            for await (const chunk of streamResult.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                fullText += chunkText;
                res.write(`data: ${JSON.stringify(chunkText)}\n\n`);
              }
            }
            if (fullText) break; // Successful stream
          } catch (modelErr: any) {
            console.warn(`[AI Explain] Gemini model ${modelName} stream notice:`, modelErr?.message || modelErr);
            if (modelErr?.message?.includes('403') || modelErr?.message?.includes('Permission denied')) {
              break; // Key lacks permission on service; skip rest of Gemini models immediately
            }
          }
        }
      } catch (geminiErr: any) {
        console.warn('[AI Explain] Gemini vision streaming notice:', geminiErr?.message || geminiErr);
      }
    }

    // Path 3: OpenRouter streaming fallback (meta-llama/llama-3.3-70b-instruct or qwen/qwen-2.5-72b-instruct)
    if (!fullText && process.env.OPENROUTER_API_KEY) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENROUTER_CANDIDATE_MODELS[0] || 'meta-llama/llama-3.3-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            stream: true,
          }),
        });

        if (orRes.ok && orRes.body) {
          const reader = orRes.body.getReader();
          const decoder = new TextDecoder();
          let orBuffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            orBuffer += decoder.decode(value, { stream: true });
            const lines = orBuffer.split('\n\n');
            orBuffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullText += delta;
                  res.write(`data: ${JSON.stringify(delta)}\n\n`);
                }
              } catch {}
            }
          }
        }
      } catch (orErr) {
        console.warn('[AI Explain] OpenRouter streaming error:', orErr);
      }
    }

    // Path 4: Secondary Groq attempt
    if (!fullText && process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const groqStream = await groq.chat.completions.create({
          model: GROQ_SMART_MODELS[1] || 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: true,
          temperature: 0.5,
        });

        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            res.write(`data: ${JSON.stringify(delta)}\n\n`);
          }
        }
      } catch (groqFallbackErr) {
        console.error('[AI Explain] Groq final fallback error:', groqFallbackErr);
      }
    }

    if (!fullText) {
      fullText = `### Explanation (Slide ${slideNumber || 'Overview'})\n\n${cleanSlideText || 'Please review the slide material. If math or diagrams are present, make sure the slide image is clear.'}`;
      res.write(`data: ${JSON.stringify(fullText)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    consumeUserQuota(req.user!.id, 'slide_explanation', req.body?.model_tier || req.headers?.['x-model-tier'] || 'default').catch(console.error);
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }
    res.write(`data: ${JSON.stringify(`\n\n### Slide Overview\n\n${cleanSlideText || 'Please review the slide material.'}`)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
  } catch (outerErr: any) {
    console.error("CRITICAL ROUTE ERROR:", outerErr);
    if (!res.headersSent) res.status(500).json({ error: outerErr.message, stack: outerErr.stack });
  }
});

// --- Wellbeing AI Endpoints ---

router.get('/motivational-quote', async (req: Request, res: Response) => {
  try {
    // 1. Fetch user calendar events for context
    const { data: upcomingExams } = await supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('user_id', req.user!.id)
      .eq('type', 'exam')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(3);

    // 2. Fetch user effort stats for context
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: sessions } = await supabaseAdmin
      .from('study_sessions')
      .select('duration_minutes')
      .eq('user_id', req.user!.id)
      .eq('status', 'completed')
      .gte('created_at', sevenDaysAgo.toISOString());
      
    const totalMinutes = sessions?.reduce((a: any, c: any) => a + (c.duration_minutes || 0), 0) || 0;

    const prompt = `Generate a short, single-sentence motivational quote for a university student.
Context:
- Upcoming exams: ${upcomingExams?.length ? upcomingExams.map((e: any) => e.title).join(', ') : 'None scheduled'}
- Study effort this week: ${totalMinutes} minutes
The quote must reference their actual situation naturally (e.g. "You have an Engineering exam in 8 days and your effort this week shows you are building real momentum."). Do NOT use generic quotes.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_SMART_MODELS[0],
        messages: [
          { role: 'system', content: 'You are an inspiring academic coach.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!groqRes.ok) throw new Error('Groq failed');
    const data = await groqRes.json();
    const quote = data.choices?.[0]?.message?.content?.replace(/["']/g, '') || "Keep pushing forward, you're doing great!";

    res.json({ quote });
  } catch (err: any) {
    console.error('Motivational Quote Error:', err);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

router.post('/study-break', withAIQuota('break_suggestion'), async (req: Request, res: Response) => {
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_SMART_MODELS[0],
        messages: [
          { role: 'system', content: 'You suggest highly practical, specific 5-minute study breaks to prevent burnout.' },
          { role: 'user', content: 'I just finished a 25-minute pomodoro study session. Suggest one specific, actionable 5-minute break activity (e.g. physical movement, visual rest). Keep it under 2 sentences.' }
        ]
      })
    });

    if (!groqRes.ok) throw new Error('Groq failed');
    const data = await groqRes.json();
    const suggestion = data.choices?.[0]?.message?.content || "Take a 5-minute walk and drink some water.";

    res.json({ suggestion });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

router.post('/anxiety-response', withAIQuota('chat_message'), async (req: Request, res: Response) => {
  try {
    const { feeling } = req.body;
    
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_SMART_MODELS[0],
        messages: [
          { role: 'system', content: 'You are a supportive academic coach helping students with pre-exam anxiety.' },
          { role: 'user', content: `I have an exam tomorrow and I am feeling: ${feeling}. Suggest one specific, quick technique (like box breathing or positive visualization) to help me right now. Keep it under 3 sentences and very supportive.` }
        ]
      })
    });

    if (!groqRes.ok) throw new Error('Groq failed');
    const data = await groqRes.json();
    const suggestion = data.choices?.[0]?.message?.content || "Take a deep breath. You have prepared for this, and you can handle whatever comes tomorrow.";

    res.json({ suggestion });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

router.post('/grade-essay', async (req: Request, res: Response) => {
  try {
    const { z } = await import('zod');
    const GradeEssaySchema = z.object({
      prompt: z.string().trim().max(4000).optional(),
      essay: z.string().trim().min(50, 'Essay is too short to grade (minimum 50 characters)').max(30000),
    });

    const parsedInput = GradeEssaySchema.safeParse(req.body);
    if (!parsedInput.success) {
      return res.status(400).json({ error: parsedInput.error.issues[0]?.message || 'Invalid essay payload' });
    }

    const essay = parsedInput.data.essay;
    const prompt = parsedInput.data.prompt || 'General University Essay';

    const { chatCompletionWithFallback } = await import('../lib/ai/safeGroq');
    const {
      buildEssayGraderPrompt,
      buildPerfectEssayRewritePrompt,
      parseEssayReportJson,
      normalizeEssayReport,
      buildDeterministicEssayReport,
    } = await import('../../../shared/lib/essayGrader');

    const systemPrompt = buildEssayGraderPrompt(prompt, essay);
    let parsed: Record<string, unknown> | null = null;

    try {
      const rawJson = await chatCompletionWithFallback({
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });
      parsed = parseEssayReportJson(rawJson);
    } catch (aiErr: unknown) {
      console.warn('AI completion failed on backend essay grading, using fallback report:', aiErr instanceof Error ? aiErr.message : aiErr);
    }

    if (parsed) {
      const existingPerfect = typeof parsed.perfect_essay === 'string' ? parsed.perfect_essay.trim() : '';
      if (existingPerfect.length < 120) {
        try {
          const weaknesses = Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map((w) => String(w)) : [];
          const grammarFeedback = typeof parsed.grammar === 'string' ? parsed.grammar : undefined;
          const rewritten = await chatCompletionWithFallback({
            messages: [{ role: 'user', content: buildPerfectEssayRewritePrompt(prompt, essay, weaknesses, grammarFeedback) }],
            max_tokens: 4096,
          });
          if (rewritten && rewritten.trim().length >= 120) {
            parsed.perfect_essay = rewritten.trim();
          }
        } catch (rewriteErr: unknown) {
          console.warn('Second-pass 100/100 essay rewrite failed:', rewriteErr instanceof Error ? rewriteErr.message : rewriteErr);
        }
      }
    }

    const finalReport = parsed
      ? normalizeEssayReport(parsed, prompt, essay)
      : buildDeterministicEssayReport(prompt, essay);

    res.json({ success: true, report: finalReport });
  } catch (err: any) {
    console.error('Backend essay grading error:', err);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

export default router;
