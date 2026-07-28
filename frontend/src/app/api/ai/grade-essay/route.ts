import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { highCostRatelimit } from '@/lib/ratelimit';

const RequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt is too short'),
  essay: z.string().min(50, 'Essay is too short to grade'),
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authResult.user.id;

    const { success } = await highCostRatelimit.limit(userId);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    const { prompt, essay } = RequestSchema.parse(body);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `
      You are a strict but fair university professor grading an essay.
      
      Essay Prompt / Topic:
      ${prompt}
      
      Student's Essay:
      ${essay}
      
      Please provide a structured grading report in JSON format with the following keys:
      - score: A percentage out of 100 (integer)
      - grade: A letter grade (e.g., A, B+, C)
      - feedback: A comprehensive 3-4 sentence overall feedback.
      - strengths: An array of 2-3 specific strengths of the essay.
      - weaknesses: An array of 2-3 specific weaknesses or areas for improvement.
      - grammar: A brief comment on grammar, spelling, and tone.
      
      Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
    `;

    const result = await model.generateContent(systemPrompt);
    let text = result.response.text().trim();
    
    // Strip markdown code blocks if the model includes them despite instructions
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const gradingReport = JSON.parse(text);

    return NextResponse.json({ report: gradingReport });
  } catch (err: any) {
    console.error('Essay Grader Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
