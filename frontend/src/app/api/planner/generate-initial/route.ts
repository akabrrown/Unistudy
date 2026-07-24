import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { highCostRatelimit } from '@/lib/ratelimit';

// Note: We don't need to validate a body schema if we derive userId from auth


const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch the profile to get study frequency, hours, degree, etc.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('study_frequency, study_hours_per_session, degree_programme, year_of_study')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ 
        role: 'user', 
        content: `Generate a realistic weekly study planner for a ${profile.degree_programme} Year ${profile.year_of_study} student.
Study frequency: ${profile.study_frequency || 'most_days'}.
Session length: ${profile.study_hours_per_session || '1_to_2'} per session.
Create a 7-day schedule with specific time blocks for studying.
Include: study sessions, revision slots, and rest days.
Return JSON ONLY in this format, with no markdown formatting around it: { "schedule": [{ "day": "Monday", "sessions": [{ "start": "09:00", "end": "11:00", "label": "Study Block" }] }] }` 
      }]
    });

    const content = response.choices[0].message.content;
    let scheduleData;
    
    try {
      // Basic cleanup in case Groq returns markdown code blocks
      const cleanedContent = content?.replace(/```json/gi, '').replace(/```/gi, '').trim() || '{}';
      scheduleData = JSON.parse(cleanedContent).schedule;
    } catch (e) {
      console.error('Failed to parse Groq response:', content);
      return NextResponse.json({ error: 'Failed to generate a valid schedule format' }, { status: 500 });
    }

    // Save to study_schedule_templates table
    const { error: insertError } = await supabase.from('study_schedule_templates').insert({
      user_id: userId,
      schedule: scheduleData,
      generated_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('Error saving template:', insertError);
      return NextResponse.json({ error: 'Failed to save schedule template' }, { status: 500 });
    }

    return NextResponse.json({ success: true, schedule: scheduleData });

  } catch (err: any) {
    console.error('Planner Generation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
