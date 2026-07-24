import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

const QUESTIONS = [
  { id: 1, q: 'When studying a new topic, I prefer to...', options: [
    { a: 'See a diagram or chart first', style: 'visual' },
    { a: 'Hear someone explain it aloud', style: 'auditory' },
    { a: 'Read the textbook definition', style: 'reading_writing' },
    { a: 'Try a practice problem immediately', style: 'kinaesthetic' },
  ]},
  { id: 2, q: 'I remember information best when...', options: [
    { a: 'I draw it or map it out', style: 'visual' },
    { a: 'I say it out loud or discuss it', style: 'auditory' },
    { a: 'I write it in my own words', style: 'reading_writing' },
    { a: 'I apply it to a real example', style: 'kinaesthetic' },
  ]},
  { id: 3, q: 'My lecture notes usually look like...', options: [
    { a: 'Mind maps and coloured diagrams', style: 'visual' },
    { a: 'Voice recordings or spoken summaries', style: 'auditory' },
    { a: 'Detailed written notes and definitions', style: 'reading_writing' },
    { a: 'Worked examples and practice questions', style: 'kinaesthetic' },
  ]},
  { id: 4, q: 'When I am stuck on a problem, I...', options: [
    { a: 'Look for a visual explanation online', style: 'visual' },
    { a: 'Ask someone to explain it to me', style: 'auditory' },
    { a: 'Read more about the concept', style: 'reading_writing' },
    { a: 'Try different approaches until one works', style: 'kinaesthetic' },
  ]},
  { id: 5, q: 'I find it easiest to understand concepts through...', options: [
    { a: 'Watching demonstrations and videos', style: 'visual' },
    { a: 'Group discussions and verbal explanations', style: 'auditory' },
    { a: 'Reading articles and textbooks', style: 'reading_writing' },
    { a: 'Hands-on practice and experiments', style: 'kinaesthetic' },
  ]},
];

export async function GET() {
  return NextResponse.json({ questions: QUESTIONS });
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  
  try {
    const { answers } = z.object({ 
      answers: z.record(z.string(), z.string()) 
    }).parse(await req.json());
    
    // Count style votes
    const counts: Record<string, number> = {};
    Object.values(answers).forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    
    const supabase = await createClient();
    await supabase.from('profiles').update({ learning_style: winner }).eq('id', userId);
    
    return NextResponse.json({ style: winner, counts });
  } catch (e) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
