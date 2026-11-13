import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { compile, derivative, evaluate, format, lusolve, simplify } from 'mathjs'
import { z } from 'zod'
import { withAIQuota } from '@/lib/ai/middleware'
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../../shared/constants/aiModels'
import {
  buildUniversalMathSolverPrompt,
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
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parsed = CalculatorRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid math request' },
      { status: 400 }
    )
  }

  const { problem = '', subject, level, imageBase64, mimeType } = parsed.data
  const casCheck =
    !imageBase64 && problem
      ? tryDeterministicMathSolve(problem, {
          compile,
          derivative,
          evaluate,
          format,
          lusolve,
          simplify,
        })
      : null
  const promptText = buildUniversalMathSolverPrompt({
    problem,
    subject,
    level,
    verifiedComputation: casCheck,
  })

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
        if (imageBase64) {
          const img = stripDataUrlPrefix(imageBase64)
          const effectiveMime = normalizeVisionMimeType(mimeType || img.mimeType)

          // 1. Gemini Vision (stream first, non-stream fallback if stream fails)
          if (!fullText && process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
            for (const modelName of GEMINI_CANDIDATE_MODELS) {
              try {
                const model = genAI.getGenerativeModel({
                  model: modelName,
                  generationConfig: { temperature: 0.15, maxOutputTokens: 3000 },
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

          // 2. OpenRouter Vision fallback (vision-capable Gemini models first)
          if (!fullText && process.env.OPENROUTER_API_KEY) {
            const dataUrl = `data:${effectiveMime};base64,${img.data}`
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
                    max_tokens: 3000,
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
                  signal: AbortSignal.timeout(15000),
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
        }

        // Text-based solver (or fallback when problem text was also provided alongside an image)
        if (!fullText.trim() && (!imageBase64 || problem.trim())) {
          // 1. Groq Streaming (low temperature for algebraic fidelity)
          if (process.env.GROQ_API_KEY) {
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
            for (const model of GROQ_SMART_MODELS) {
              try {
                const stream = await groq.chat.completions.create({
                  model,
                  stream: true,
                  temperature: 0.15,
                  max_tokens: 3000,
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
                  generationConfig: { temperature: 0.15, maxOutputTokens: 3000 },
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
                    max_tokens: 3000,
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
