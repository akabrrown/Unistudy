import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';
import { highCostRatelimit } from '@/lib/ratelimit';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const dayMap: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'
};

export async function POST(req: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    try {
      const { success } = await highCostRatelimit.limit(userId!);
      if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
      }
    } catch (ratelimitError) {
      console.warn('Rate limiter failed (bypassing):', ratelimitError);
    }

    const { startDate, endDate, courses, days, coursesPerDay, slots } = await req.json();

    if (!startDate || !endDate || !courses || !days || !coursesPerDay || !slots) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slotStrings = slots.map((s: any) => s.start + " - " + s.end).join(', ');

    const prompt = "Create a strict weekly study timetable for a university student.\n" +
      "Courses they are taking: " + courses.join(', ') + ".\n" +
      "They study ONLY on these days: " + days.join(', ') + ".\n" +
      "On each study day, they will study exactly " + coursesPerDay + " course(s).\n" +
      "The exact time slots for these sessions are: " + slotStrings + ".\n\n" +
      "Rules:\n" +
      "1. Only include the days they specified.\n" +
      "2. For each included day, provide exactly " + coursesPerDay + " sessions, matching the time slots sequentially.\n" +
      "3. Distribute the courses evenly across all available sessions.\n\n" +
      "Return JSON ONLY in exactly this format, with no markdown formatting around it:\n{\n  \"schedule\": [\n    {\n      \"day\": \"monday\",\n      \"sessions\": [\n        { \"start\": \"10:00\", \"end\": \"12:00\", \"label\": \"Data Structures Study\" }\n      ]\n    }\n  ]\n}";

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ 
        role: 'user', 
        content: prompt
      }]
    });

    const content = response.choices[0].message.content;
    let scheduleData;
    
    try {
      const cleanedContent = content?.replace(/```json/gi, '').replace(/```/gi, '').trim() || '{}';
      scheduleData = JSON.parse(cleanedContent).schedule;
    } catch (e) {
      console.error('Failed to parse Groq response:', content);
      return NextResponse.json({ error: 'Failed to generate a valid schedule format' }, { status: 500 });
    }

    // Enforce hard limits — the AI cannot be trusted to always respect coursesPerDay.
    // Cap each day's sessions to exactly coursesPerDay, and stamp the correct slot times.
    scheduleData = (scheduleData as any[]).map((dayEntry: any) => {
      const capped = (dayEntry.sessions || []).slice(0, Number(coursesPerDay));
      const aligned = capped.map((session: any, i: number) => ({
        ...session,
        start: slots[i]?.start ?? session.start,
        end: slots[i]?.end ?? session.end,
      }));
      return { ...dayEntry, sessions: aligned };
    });

    const supabase = await createClient();


    // 1. Save to study_schedule_templates table
    const { error: insertError } = await supabase.from('study_schedule_templates').insert({
      user_id: userId,
      schedule: {
        semester_start: startDate,
        semester_end: endDate,
        weekly_template: scheduleData
      },
      generated_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('Error saving template:', insertError);
      return NextResponse.json({ error: 'Failed to save schedule template' }, { status: 500 });
    }

    // 2. Project events onto the live calendar
    const start = new Date(startDate);
    const end = new Date(endDate);
    const calendarEvents = [];

    // Ensure we don't accidentally create an infinite loop or millions of rows
    const maxDays = 180; // ~6 months max for a semester
    let daysCount = 0;

    for (let d = new Date(start); d <= end && daysCount < maxDays; d.setDate(d.getDate() + 1)) {
      daysCount++;
      const dayName = dayMap[d.getDay()];
      const daySchedule = scheduleData.find((s: any) => s.day.toLowerCase() === dayName);
      
      if (daySchedule && daySchedule.sessions) {
        for (const session of daySchedule.sessions) {
          calendarEvents.push({
            user_id: userId,
            title: session.label + " (" + session.start + " - " + session.end + ")",
            date: d.toISOString().split('T')[0],
            type: 'session'
          });
        }
      }
    }

    if (calendarEvents.length > 0) {
      const { error: calError } = await supabase.from('calendar_events').insert(calendarEvents);
      if (calError) {
        console.error('Error populating calendar:', calError);
        // We still return success because the template was saved, but we could warn the user
      }
    }

    return NextResponse.json({ success: true, schedule: scheduleData, totalEventsScheduled: calendarEvents.length });

  } catch (err: any) {
    console.error('Smart Planner Generation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
