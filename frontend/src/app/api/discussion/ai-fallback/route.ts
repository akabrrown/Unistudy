import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// This would typically be called by a cron job
// For example, Vercel cron hitting this endpoint every hour
export async function POST(req: NextRequest) {
  // Add some simple auth to ensure only our cron can trigger this (e.g. Bearer token check)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Find threads older than 24 hours that haven't been answered by AI yet
    // and have 0 replies.
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: threads, error } = await supabase
      .from('discussion_threads')
      .select('id, title, body, courses(title)')
      .eq('is_ai_answered', false)
      .lt('created_at', twentyFourHoursAgo);

    if (error) throw error;
    if (!threads || threads.length === 0) {
      return NextResponse.json({ success: true, message: 'No unanswered threads found.' });
    }

    let processedCount = 0;

    for (const thread of threads) {
      // Double check reply count just to be safe
      const { count, error: countErr } = await supabase
        .from('discussion_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);
        
      if (countErr || count! > 0) continue; // Someone replied, skip AI fallback

      // Generate AI response
      const courseTitle = (thread as any).courses?.title || 'a university course';
      const prompt = `You are UniStudy AI, an expert academic tutor. A student has asked the following question in the course discussion board for "${courseTitle}". No other students have replied in 24 hours, so you are stepping in to help. 
Provide a clear, encouraging, and accurate answer to their question. Use markdown formatting.

Title: ${thread.title}
Question: ${thread.body}

Your response:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
      });

      const aiReply = response.text;

      if (aiReply) {
        // Insert AI reply
        await supabase
          .from('discussion_replies')
          .insert({
            thread_id: thread.id,
            author_id: null, // Null indicates AI author
            body: aiReply,
            is_ai: true
          });

        // Update thread to mark it answered
        await supabase
          .from('discussion_threads')
          .update({ is_ai_answered: true })
          .eq('id', thread.id);
          
        processedCount++;
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (err: any) {
    console.error('AI Fallback Cron Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
