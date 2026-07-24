import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const supabase = await createClient();

    const { data: template, error: fetchErr } = await supabase
      .from('study_schedule_templates')
      .select('schedule')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchErr && fetchErr.code !== 'PGRST116') { // PGRST116 is 'not found'
      throw fetchErr;
    }

    return NextResponse.json({ template: template ? template.schedule : null });

  } catch (err: any) {
    console.error('Template Fetch Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const supabase = await createClient();

    // 1. Delete all study_schedule_templates for this user
    await supabase.from('study_schedule_templates').delete().eq('user_id', userId);

    // 2. Delete all calendar_events of type 'session' for this user
    await supabase.from('calendar_events').delete().eq('user_id', userId).eq('type', 'session');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Template Delete Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { updatedTemplate } = await req.json();
    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Missing updatedTemplate' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch existing to get semester_start and end
    const { data: existing, error: fetchErr } = await supabase
      .from('study_schedule_templates')
      .select('schedule, id')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchErr) throw fetchErr;

    const newSchedule = {
      ...existing.schedule,
      weekly_template: updatedTemplate
    };

    // Update the template
    await supabase.from('study_schedule_templates').update({ schedule: newSchedule }).eq('id', existing.id);

    // Delete existing sessions
    await supabase.from('calendar_events').delete().eq('user_id', userId).eq('type', 'session');

    // Re-project
    const start = new Date(newSchedule.semester_start);
    const end = new Date(newSchedule.semester_end);
    const calendarEvents = [];
    
    const dayMap: Record<number, string> = {
      0: 'sunday', 1: 'monday', 2: 'tuesday',
      3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'
    };

    const maxDays = 180;
    let daysCount = 0;

    for (let d = new Date(start); d <= end && daysCount < maxDays; d.setDate(d.getDate() + 1)) {
      daysCount++;
      const dayName = dayMap[d.getDay()];
      const daySchedule = updatedTemplate.find((s: any) => s.day.toLowerCase() === dayName);
      
      if (daySchedule && daySchedule.sessions) {
        for (const session of daySchedule.sessions) {
          calendarEvents.push({
            user_id: userId,
            title: `${session.label} (${session.start} - ${session.end})`,
            date: d.toISOString().split('T')[0],
            type: 'session'
          });
        }
      }
    }

    if (calendarEvents.length > 0) {
      const { error: calError } = await supabase.from('calendar_events').insert(calendarEvents);
      if (calError) {
        console.error('Error inserting calendar events on sync:', calError);
        throw calError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Template Update Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
