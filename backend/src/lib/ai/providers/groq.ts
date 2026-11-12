import Groq from 'groq-sdk'

import { AIRequest } from '../router'
import { GROQ_FAST_MODELS, GROQ_SMART_MODELS } from '../../../../../shared/constants/aiModels'

export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set")
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

async function createCompletionWithModels(
  groq: Groq,
  models: readonly string[],
  buildPayload: (model: string) => any
) {
  let lastError: unknown = null
  for (const model of models) {
    try {
      return await groq.chat.completions.create(buildPayload(model))
    } catch (err) {
      lastError = err
      console.warn(`[Groq] Model ${model} failed, trying next:`, err instanceof Error ? err.message : err)
    }
  }
  throw lastError || new Error('All Groq candidate models failed')
}

export async function handleGroqRequest(req: AIRequest) {
  const groq = getGroqClient()
  const isFast =
    req.feature === 'daily_brief' ||
    req.feature === 'motivational_quote' ||
    req.feature === 'break_suggestion'
  const models = isFast ? GROQ_FAST_MODELS : GROQ_SMART_MODELS

  if (req.feature === 'calculator') {
    const systemPrompt = `You are a strict, methodical AI calculator.
      Subject: ${req.payload.subject}, Level: ${req.payload.level}
      Show EVERY step of the calculation. Use standard LaTeX $...$ notation for math.`

    return createCompletionWithModels(groq, models, (model) => ({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: req.payload.prompt || '' }
      ],
      model,
      stream: true
    }))
  }

  if (req.feature === 'chat_message') {
    const cleanMessages = (req.payload.messages || []).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '')
    }))
    return createCompletionWithModels(groq, models, (model) => ({
      messages: [
        { role: 'system', content: req.payload.systemPrompt || 'You are a helpful assistant.' },
        ...cleanMessages
      ],
      model,
      stream: req.payload.stream || false
    }))
  }

  if (req.feature === 'daily_brief') {
    const prompt = `Generate a daily study brief for the student.
      Weak Topics: ${(req.payload.weakTopics || []).join(', ')}
      Due Flashcards: ${req.payload.dueCards || 0}
      Exams: ${req.payload.upcomingExams || 'None'}
      
      Format: 3 specific tasks, time estimate, one motivational line.
      Constraint: Under 150 words. Strict.`

    const result = await createCompletionWithModels(groq, models, (model) => ({
      messages: [{ role: 'user', content: prompt }],
      model
    })) as any

    return result.choices?.[0]?.message?.content || ''
  }

  if (req.feature === 'motivational_quote') {
    const result = await createCompletionWithModels(groq, models, (model) => ({
      messages: [{ role: 'user', content: `Give me a single motivational quote tailored for a ${req.payload.degree} student who has been performing ${req.payload.recentPerformance}. No intro.` }],
      model
    })) as any
    return result.choices?.[0]?.message?.content || 'Keep going!'
  }

  if (req.feature === 'revision_song') {
    const prompt = `Write a short revision rap or song covering the key facts of the following lecture material.
      Constraint 1: Use an AABB rhyme scheme.
      Constraint 2: Every single line must contain factual academic content, no filler.
      Constraint 3: Format the output with clear stanzas. Do not include introductory or concluding conversational text.

      Lecture material:
      ${req.payload.prompt}
    `;
    const songResult = await createCompletionWithModels(groq, GROQ_SMART_MODELS, (model) => ({
      messages: [{ role: 'user', content: prompt }],
      model
    })) as any
    return songResult.choices?.[0]?.message?.content || 'No song generated.'
  }

  if (req.feature === 'flashcard_generation') {
    const prompt = `
      Generate a set of high-quality, comprehensive flashcards from the provided lecture text.
      Return ONLY a JSON object containing a "flashcards" array. Structure:
      { "flashcards": [ { "front": "question or concept", "back": "answer or explanation" } ] }

      Lecture material:
      ${req.payload.prompt}
    `;
    const result = await createCompletionWithModels(groq, GROQ_SMART_MODELS, (model) => ({
      messages: [{ role: 'user', content: prompt }],
      model,
      response_format: { type: 'json_object' }
    })) as any
    return result.choices?.[0]?.message?.content || '{"flashcards": []}'
  }

  // Fallback
  const result = await createCompletionWithModels(groq, models, (model) => ({
    messages: [{ role: 'user', content: req.payload.prompt || 'Hello' }],
    model
  })) as any
  return result.choices?.[0]?.message?.content
}
