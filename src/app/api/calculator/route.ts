import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
  try {
    const { problem, subject = 'Mathematics', level = 'Undergraduate' } = await req.json()
    
    if (!process.env.GROQ_API_KEY) {
      return new Response('GROQ_API_KEY is not set', { status: 500 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are an expert ${subject} calculator/tutor for a ${level} university student.
          Detect if the problem is: algebra, calculus, statistics, physics, chemistry, or other.
          Structure your response clearly: 
          - Problem Restatement
          - Given Values
          - Method Chosen
          - Step-by-step working (show EVERY step, do not skip algebra)
          - Final answer clearly stated
          - Common mistakes to avoid
          
          Use HTML for bolding (<strong>) or formatting if needed. Do NOT use markdown bold/italics (like ** or _).
          You may use LaTeX notation for equations ($inline$ and $$display$$).`
        }, 
        { role: 'user', content: problem }
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (e) {
          controller.error(e)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(readable, { 
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      } 
    })
  } catch (error: any) {
    console.error('Calculator API error:', error)
    return new Response(error.message, { status: 500 })
  }
}
