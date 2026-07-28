import { GoogleGenerativeAI } from '@google/generative-ai'
import { setCache } from '../cache'

export async function getGeminiModel() {
  // Use optimal key from rotation if available, or fallback
  const { executeWithRotation } = await import('@/lib/ai/keyManager')
  
  // Here we just fetch the optimal key for gemini
  let key = process.env.GEMINI_API_KEY
  try {
    key = await executeWithRotation('gemini', async (k) => ({ result: k, tokens: 0 }))
  } catch (e) {
    console.log("Using env fallback for gemini")
  }
  
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  
  const genAI = new GoogleGenerativeAI(key)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

export async function explainSlide(slideId: string, imageBase64: string, studentContext: any) {
  const model = await getGeminiModel()
  
  const prompt = `
    You are an expert university tutor. Explain this slide to a student.
    Student Context: ${JSON.stringify(studentContext)}
    
    DETECT content type (calculation vs conceptual).
    CALCULATION MODE: WHY then HOW, every step shown, anti-essay guard.
    CONCEPTUAL MODE: analogy first, then academic definition, then example.
  `

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/jpeg"
      }
    }
  ])
  
  const explanation = result.response.text()
  
  // Fire and forget cache
  setCache('slide_explanation', explanation, slideId).catch(console.error)
  
  return explanation
}

export async function generateQuiz(lectureId: string, imageBase64Array: string[], questionCount: number, difficulty: string) {
  const model = await getGeminiModel()
  
  const parts: any[] = [
    `Generate exactly ${questionCount} multiple choice questions from the provided slide images at a ${difficulty} difficulty level.
     Return ONLY a JSON array of objects with the structure:
     { "question": string, "options": string[], "correct_option": string }`
  ]

  for (const img of imageBase64Array) {
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
  
  const rawText = result.response.text()
  const quiz = JSON.parse(rawText)
  
  return quiz
}

// ... Additional exports for flashcards, grading, tagging, etc.
// Following the exact cache-first architectural pattern.
