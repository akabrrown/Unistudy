import { GoogleGenerativeAI } from '@google/generative-ai'
import { setCache } from '../cache'
import { AIRequest } from '../router'

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash',
  'gemini-1.5-pro'
]

export async function getGeminiModel() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const genAI = new GoogleGenerativeAI(key)
  // Return the first model name; the router will handle fallback via callWithFallback
  return genAI.getGenerativeModel({ model: GEMINI_MODELS[0] })
}

export async function callGeminiWithFallback(
  buildRequest: (model: any) => Promise<any>
): Promise<any> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const genAI = new GoogleGenerativeAI(key)
  try {
    let lastErr: any;
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        return await buildRequest(model)
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() || ''
        const status = err?.status
        const isTransientError = 
          msg.includes('503') || msg.includes('unavailable') || status === 503 ||
          msg.includes('429') || msg.includes('too many requests') || msg.includes('quota') || status === 429 ||
          msg.includes('404') || msg.includes('not found') || status === 404 ||
          msg.includes('403') || msg.includes('forbidden') || status === 403
        
        if (isTransientError) { lastErr = err; continue }
        throw err
      }
    }
    throw lastErr
  } catch (err: any) {
    console.error('[Gemini] All models exhausted, propagating to router fallback:', err?.message || err)
    throw err
  }
}

export async function handleGeminiRequest(req: AIRequest) {
  return callGeminiWithFallback(async (model) => {
    let accessibilityContext = '';
    if (req.userSettings) {
      const s = req.userSettings;
      accessibilityContext = `
        Tutor Identity: Your name is ${s.ai_tutor_name}. You have a ${s.ai_personality} personality.
        Language: You MUST respond entirely in the language code: ${s.language}.
        Tone: ${s.ai_tone}
        Reading Level: ${s.ai_reading_level} (adapt the complexity of your vocabulary and concepts to this level).
        Learning Style: ${s.learning_style ? `Target a ${s.learning_style} learning style.` : ''}
      `;
    }

    if (req.feature === 'slide_explanation') {
      const prompt = `
        You are an expert university tutor. Explain this slide to a student.
        Student Context: ${JSON.stringify(req.payload.studentContext || {})}
        ${accessibilityContext}
        
        DETECT content type (calculation vs conceptual).
        CALCULATION MODE: WHY then HOW, every step shown, anti-essay guard.
        CONCEPTUAL MODE: analogy first, then academic definition, then example.
      `
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: req.payload.imageBase64!.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: "image/jpeg"
          }
        }
      ])
      const explanation = result.response.text()
      if (req.identifiers?.[0]) {
        setCache('slide_explanation', req.userId, explanation, req.identifiers[0]).catch(console.error)
      }
      return explanation
    }

    if (req.feature === 'quiz_generation') {
      const parts: any[] = [
        { text: `Generate exactly ${req.payload.questionCount || 5} questions from the provided slide images at a ${req.payload.difficulty || 'medium'} difficulty level.
         You must generate a MIX of question types: "mcq" (Multiple Choice), "fill_in" (Fill in the blank), and "theory" (Essay/Short Answer).
         Return ONLY a JSON array of objects with the structure:
         { 
           "question": string, 
           "type": "mcq" | "fill_in" | "theory",
           "options": [{ "text": string, "label": string }] | null (for mcq only, otherwise null. Use labels "A", "B", "C", etc.), 
           "correct_option": string (for mcq, use label like "A", "B", etc. For fill_in, provide the exact word/phrase. For theory, provide a model ideal answer),
           "explanation": string (brief explanation of the answer)
         }` }
      ]

      for (const img of (req.payload.imageBase64Array || [])) {
        parts.push({
          inlineData: {
            data: img.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: "image/jpeg"
          }
        })
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: "application/json" }
      })
      return JSON.parse(result.response.text())
    }

    if (req.feature === 'flashcard_generation') {
      const prompt = `
        Generate a set of high-quality, comprehensive flashcards from the provided lecture text and explanations.
        The flashcards should cover key concepts, definitions, and important facts.
        Return ONLY a JSON array of objects with the structure:
        { "front": "question or concept", "back": "answer or explanation" }

        Content to process:
        ${req.payload.prompt}
      `
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
      return JSON.parse(result.response.text())
    }

    if (req.feature === 'study_poster') {
      const prompt = `
        You are an expert educator. Generate a structured one-page study infographic from the provided lecture text.
        The output MUST be a JSON object matching this structure:
        {
          "title": "Main Topic",
          "sections": [
            {
              "heading": "Section Heading",
              "points": ["Fact 1", "Fact 2"]
            }
          ],
          "keywords": ["keyword1", "keyword2"]
        }
        
        Lecture text:
        ${req.payload.prompt}
      `
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
      return JSON.parse(result.response.text())
    }

    if (req.feature === 'cheat_sheet') {
      const prompt = `
        You are an expert educator. Compress the entire following lecture into a maximum-density one-page study cheat sheet.
        Include all formulas, key definitions, and essential facts. Remove all padding.
        The output MUST be a JSON object matching this structure:
        {
          "title": "Cheat Sheet Title",
          "columns": [
            {
              "category": "Category Name",
              "items": ["Dense fact or formula 1", "Dense fact 2"]
            }
          ]
        }
        
        Lecture text:
        ${req.payload.prompt}
      `
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
      return JSON.parse(result.response.text())
    }

    if (req.feature === 'generate_mnemonics') {
      const prompt = `
        Generate exactly 3 types of mnemonics to help memorize the following list of facts or steps:
        1. Acronym (using the first letters)
        2. Sentence mnemonic (a memorable sentence using the first letters)
        3. Rhyme (a short rhyme connecting the concepts)
        
        The output MUST be a JSON object matching this structure:
        {
          "acronym": "The acronym",
          "sentence": "The sentence",
          "rhyme": "The rhyme"
        }
        
        Facts/Steps:
        ${req.payload.prompt}
      `
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
      return JSON.parse(result.response.text())
    }

    // Fallback for other Gemini text tasks
    const result = await model.generateContent(req.payload.prompt || 'Hello')
    return result.response.text()
  })
}
