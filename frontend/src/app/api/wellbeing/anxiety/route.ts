import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { groqChat } from '@/lib/ai/groq';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { anxietyLevel, examName } = z.object({
      anxietyLevel: z.number().int().min(1).max(5), 
      examName: z.string().max(100).default('exam'),
    }).parse(await req.json());
    
    const technique = anxietyLevel >= 4 ? 'box breathing (4-4-4-4)' :
      anxietyLevel === 3 ? '5-4-3-2-1 grounding (name 5 things you see, 4 you hear...)' :
      'a 2-minute positive visualisation of walking into the exam feeling prepared';
      
    const prompt = `A student has an exam (${examName}) and feels anxiety level ${anxietyLevel}/5. Recommended technique: ${technique}. Write a calm, brief (80 words max) message guiding them through this technique. Be warm, specific, and end with one confidence-building sentence about their preparation.`;
    
    const result = await groqChat(prompt);
    
    return NextResponse.json({ message: result, technique });
  } catch (e) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
