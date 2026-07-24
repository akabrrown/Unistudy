import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { groqChat } from '@/lib/ai/groq';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { sessionType, durationMins } = z.object({
      sessionType: z.enum(['slides', 'flashcards', 'quiz', 'calculator', 'focus']),
      durationMins: z.number().int().min(1),
    }).parse(await req.json());
    
    const isIntensive = ['quiz', 'calculator', 'focus'].includes(sessionType);
    
    const breakType = isIntensive 
      ? 'a physical break (stand up, stretch arms overhead 3 times, then walk to a window)' 
      : 'a mental reset (close your eyes for 30 seconds, take 3 slow breaths, then look at something far away)';
      
    const prompt = `A student just finished ${durationMins} minutes of ${sessionType} study. Suggest ${breakType}. Write 2-3 sentences: the specific activity, why it helps after this type of study, and when to return. Max 60 words.`;
    
    const result = await groqChat(prompt);
    
    return NextResponse.json({ suggestion: result });
  } catch (e) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
