import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { compile, derivative, evaluate, format, lusolve, simplify } from 'mathjs'
import { z } from 'zod'
import { withAIQuota } from '@/lib/ai/middleware'
import { enforceHighCostLimit } from '@/lib/ratelimit'
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  MISTRAL_VISION_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../shared/constants/aiModels'
import {
  buildMathOcrPrompt,
  buildUniversalMathSolverPrompt,
  cleanExtractedMathText,
  sanitizeMathResponse,
  tryDeterministicMathSolve,
} from '../../../../../shared/lib/mathSolver'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CalculatorRequestSchema = z
  .object({
    problem: z.string().trim().max(12000).optional(),
    subject: z.string().trim().max(100).optional().default('Mathematics'),
    level: z.string().trim().max(100).optional().default('Undergraduate'),
    imageBase64: z.string().max(12_000_000).optional(),
    mimeType: z.string().max(100).optional(),
  })
  .refine(
    (val) => Boolean(val.problem?.trim()) || Boolean(val.imageBase64),
    'Please enter a math question or upload an image.'
  )

function normalizeVisionMimeType(rawMime?: string): string {
  const lower = (rawMime || '').trim().toLowerCase()
  if (lower === 'image/jpg' || lower === 'image/jpeg') return 'image/jpeg'
  if (lower === 'image/png') return 'image/png'
  if (lower === 'image/webp') return 'image/webp'
  if (lower === 'image/gif') return 'image/gif'
  return 'image/jpeg'
}

function stripDataUrlPrefix(input: string): { mimeType: string; data: string } {
  const trimmed = input.trim()
  const marker = ';base64,'
  const markerIdx = trimmed.indexOf(marker)
  if (trimmed.startsWith('data:') && markerIdx !== -1) {
    const rawMime = trimmed.slice(5, markerIdx)
    const rawData = trimmed.slice(markerIdx + marker.length).replace(/\s+/g, '')
    return {
      mimeType: normalizeVisionMimeType(rawMime),
      data: rawData,
    }
  }
  return {
    mimeType: 'image/jpeg',
    data: trimmed.replace(/\s+/g, ''),
  }
}

async function handler(req: Request) {
  const clientKey =
    req.headers.get('authorization')?.slice(-16) ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  const limit = await enforceHighCostLimit(`calc:${clientKey}`)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many solver requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    limit.release()
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parsed = CalculatorRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    limit.release()
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid math request' },
      { status: 400 }
    )
  }

  const { problem = '', subject, level, imageBase64, mimeType } = parsed.data
  let activeProblem = problem.trim()

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const sendObj = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      let fullText = ''
      const emitDelta = (delta: string) => {
        if (!delta) return
        fullText += delta
        sendObj({ text: delta })
      }

      try {
        // Step 1: If an image is attached and problem text is empty, extract the exact question text first
        if (imageBase64 && !activeProblem) {
          const img = stripDataUrlPrefix(imageBase64)
          const effectiveMime = normalizeVisionMimeType(mimeType || img.mimeType)
          const dataUrl = `data:${effectiveMime};base64,${img.data}`
          const ocrPrompt = buildMathOcrPrompt('math')

          if (!activeProblem && process.env.MISTRAL_API_KEY) {
            for (const model of MISTRAL_VISION_MODELS) {
              try {
                const mRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
                  method: 'POST',
                  signal: AbortSignal.timeout(9000),
                  headers: {
                    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
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
                          { type: 'image_url', image_url: dataUrl },
                        ],
                      },
                    ],
                  }),
                })
                if (mRes.ok) {
                  const mData = await mRes.json()
                  const content = mData.choices?.[0]?.message?.content?.trim()
                  if (content) {
                    activeProblem = cleanExtractedMathText(content)
                    break
                  }
                }
              } catch (err) {
                console.warn(
                  `[Calculator] Mistral OCR ${model} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }

          if (!activeProblem && process.env.OPENROUTER_API_KEY) {
            const visionModels = [
              ...OPENROUTER_CANDIDATE_MODELS.filter((m) => m.startsWith('google/')),
              ...OPENROUTER_CANDIDATE_MODELS.filter((m) => !m.startsWith('google/')),
            ]
            for (const model of visionModels) {
              try {
                const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  signal: AbortSignal.timeout(9000),
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
                })
                if (orRes.ok) {
                  const orData = await orRes.json()
                  const content = orData.choices?.[0]?.message?.content?.trim()
                  if (content) {
                    activeProblem = cleanExtractedMathText(content)
                    break
                  }
                }
              } catch (err) {
                console.warn(
                  `[Calculator] OpenRouter OCR ${model} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }

          if (activeProblem) {
            sendObj({ extractedText: activeProblem })
          }
        }

        const casCheck = activeProblem
          ? tryDeterministicMathSolve(activeProblem, {
              compile,
              derivative,
              evaluate,
              format,
              lusolve,
              simplify,
            })
          : null

        const promptText = buildUniversalMathSolverPrompt({
          problem: activeProblem,
          subject,
          level,
          verifiedComputation: casCheck,
        })

        // Step 2: If we only have an image (and OCR didn't produce text), use Vision solver directly
        if (imageBase64 && !activeProblem) {
          const img = stripDataUrlPrefix(imageBase64)
          const effectiveMime = normalizeVisionMimeType(mimeType || img.mimeType)
          const dataUrl = `data:${effectiveMime};base64,${img.data}`

          // 1. Mistral Vision Solver
          if (!fullText && process.env.MISTRAL_API_KEY) {
            for (const model of MISTRAL_VISION_MODELS) {
              try {
                const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model,
                    temperature: 0.15,
                    max_tokens: 3800,
                    messages: [
                      {
                        role: 'user',
                        content: [
                          { type: 'text', text: promptText },
                          { type: 'image_url', image_url: dataUrl },
                        ],
                      },
                    ],
                  }),
                  signal: AbortSignal.timeout(16000),
                })
                if (res.ok) {
                  const data = await res.json()
                  const content = data.choices?.[0]?.message?.content?.trim()
                  if (content) {
                    emitDelta(content)
                    break
                  }
                }
              } catch (err) {
                console.warn(
                  `[Calculator] Mistral vision ${model} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }

          // 2. OpenRouter Vision fallback (vision-capable Gemini models with safe max_tokens)
          if (!fullText && process.env.OPENROUTER_API_KEY) {
            const visionModels = [
              ...OPENROUTER_CANDIDATE_MODELS.filter((m) => m.startsWith('google/')),
              ...OPENROUTER_CANDIDATE_MODELS.filter((m) => !m.startsWith('google/')),
            ]
            for (const model of visionModels) {
              try {
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model,
                    temperature: 0.15,
                    max_tokens: 3800,
                    messages: [
                      {
                        role: 'user',
                        content: [
                          { type: 'text', text: promptText },
                          { type: 'image_url', image_url: { url: dataUrl } },
                        ],
                      },
                    ],
                  }),
                  signal: AbortSignal.timeout(16000),
                })
                if (res.ok) {
                  const data = await res.json()
                  const content = data.choices?.[0]?.message?.content?.trim()
                  if (content) {
                    emitDelta(content)
                    break
                  }
                }
              } catch (err) {
                console.warn(
                  `[Calculator] OpenRouter vision ${model} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }

          // 3. Direct Gemini Vision fallback
          if (!fullText && process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
            for (const modelName of GEMINI_CANDIDATE_MODELS) {
              try {
                const model = genAI.getGenerativeModel({
                  model: modelName,
                  generationConfig: { temperature: 0.15, maxOutputTokens: 4000 },
                })
                const parts = [
                  promptText,
                  { inlineData: { data: img.data, mimeType: effectiveMime } },
                ]
                try {
                  const streamRes = await model.generateContentStream(parts)
                  for await (const chunk of streamRes.stream) {
                    emitDelta(chunk.text())
                  }
                } catch {
                  const nonStreamRes = await model.generateContent(parts)
                  emitDelta(nonStreamRes.response.text())
                }
                if (fullText.trim()) break
              } catch (err) {
                console.warn(
                  `[Calculator] Gemini vision ${modelName} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }
        }

        // Step 3: Text-based solver (now runs whenever activeProblem was typed OR extracted from image!)
        if (!fullText.trim() && (!imageBase64 || activeProblem)) {
          // 1. Groq Streaming (low temperature for algebraic fidelity)
          if (process.env.GROQ_API_KEY) {
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
            for (const model of GROQ_SMART_MODELS) {
              try {
                const stream = await groq.chat.completions.create({
                  model,
                  stream: true,
                  temperature: 0.15,
                  max_tokens: 4000,
                  messages: [{ role: 'user', content: promptText }],
                })
                for await (const chunk of stream) {
                  emitDelta(chunk.choices[0]?.delta?.content || '')
                }
                if (fullText.trim()) break
              } catch (err) {
                console.warn(
                  `[Calculator] Groq ${model} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }

          // 2. Gemini Text Streaming fallback
          if (!fullText && process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
            for (const modelName of GEMINI_CANDIDATE_MODELS) {
              try {
                const model = genAI.getGenerativeModel({
                  model: modelName,
                  generationConfig: { temperature: 0.15, maxOutputTokens: 4000 },
                })
                const streamRes = await model.generateContentStream(promptText)
                for await (const chunk of streamRes.stream) {
                  emitDelta(chunk.text())
                }
                if (fullText.trim()) break
              } catch (err) {
                console.warn(
                  `[Calculator] Gemini ${modelName} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }

          // 3. OpenRouter fallback
          if (!fullText && process.env.OPENROUTER_API_KEY) {
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
                    temperature: 0.15,
                    max_tokens: 3800,
                    messages: [{ role: 'user', content: promptText }],
                  }),
                  signal: AbortSignal.timeout(12000),
                })
                if (res.ok) {
                  const data = await res.json()
                  const content = data.choices?.[0]?.message?.content?.trim()
                  if (content) {
                    emitDelta(content)
                    break
                  }
                }
              } catch (err) {
                console.warn(
                  `[Calculator] OpenRouter ${model} failed:`,
                  err instanceof Error ? err.message : err
                )
              }
            }
          }

          // 4. Deterministic CAS fallback if all LLM providers failed
          if (!fullText && casCheck) {
            emitDelta(casCheck.markdown)
          }

          // 5. Direct Math.js arithmetic and algebraic evaluation fallback
          if (!fullText.trim() && activeProblem) {
            try {
              const cleaned = activeProblem
                .replace(/^(?:calculate|evaluate|what\s+is|solve|find|compute)\s+/i, '')
                .replace(/[?=]+$/, '')
                .trim()
              const evalResult = evaluate(cleaned)
              if (evalResult !== undefined && evalResult !== null) {
                const formattedResult = format(evalResult, { precision: 12 })
                const mathMarkdown = `### Computed Result\n\n$$\n${cleaned} = ${formattedResult}\n$$\n\n**Answer:** **${formattedResult}**`
                emitDelta(mathMarkdown)
              }
            } catch {
              // Direct eval not applicable
            }
          }

          // 6. Helpful Problem Structure fallback
          if (!fullText.trim() && activeProblem) {
            emitDelta(
              `### Problem\n\n**Question:** ${activeProblem}\n\nAI computation providers were unreachable or timed out. Please verify algebraic notation (e.g. \`2x + 5 = 15\` or \`derivative of x^2\`) to compute step-by-step.`
            )
          }
        }

        if (!fullText.trim()) {
          sendObj({
            error: 'Unable to solve this problem right now. Please retry or check your input.',
          })
        } else {
          sendObj({ finalText: sanitizeMathResponse(fullText) })
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (e) {
        sendObj({ error: e instanceof Error ? e.message : 'Solver stream interrupted' })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
        limit.release()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export const POST = withAIQuota('calculator')(handler)
