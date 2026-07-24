import Groq from 'groq-sdk'
import { setCache } from '../cache'

export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set")
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

export async function streamCalculator(problem: string, subject: string, level: string) {
  const groq = getGroqClient()
  
  const systemPrompt = `You are a strict, methodical AI calculator.
    Subject: ${subject}, Level: ${level}
    Show EVERY step of the calculation. Use standard LaTeX $...$ notation for math.`
    
  return groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: problem }
    ],
    model: 'llama-3.3-70b-versatile',
    stream: true
  })
}

export async function streamChat(messages: any[], systemPrompt: string) {
  const groq = getGroqClient()
  return groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    model: 'llama-3.3-70b-versatile',
    stream: true
  })
}

export async function generateDailyBrief(userId: string, weakTopics: string[], dueCards: number, upcomingExams: string) {
  const groq = getGroqClient()
  
  const prompt = `Generate a daily study brief for the student.
    Weak Topics: ${weakTopics.join(', ')}
    Due Flashcards: ${dueCards}
    Exams: ${upcomingExams}
    
    Format: 3 specific tasks, time estimate, one motivational line.
    Constraint: Under 150 words. Strict.`
    
  const result = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama3-8b-8192'
  })
  
  const brief = result.choices[0]?.message?.content || ""
  
  // Cache the daily brief
  const date = new Date().toISOString().split('T')[0]
  setCache('daily_brief', brief, userId, date).catch(console.error)
  
  return brief
}

export async function generateQuote(degree: string, recentPerformance: string) {
  const groq = getGroqClient()
  
  const result = await groq.chat.completions.create({
    messages: [{ role: 'user', content: `Give me a single motivational quote tailored for a ${degree} student who has been performing ${recentPerformance}. No intro.` }],
    model: 'llama3-8b-8192'
  })
  
  return result.choices[0]?.message?.content || "Keep going!"
}
