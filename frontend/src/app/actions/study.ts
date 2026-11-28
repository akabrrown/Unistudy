'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Persists the user's last viewed slide position to the database so that
 * the "Resume Studying" card on the dashboard displays accurate live progress.
 */
export async function updateLastPosition(lectureId: string, slideNumber: number) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await (supabase.from('last_position') as any).upsert(
      {
        user_id: user.id,
        lecture_id: lectureId,
        slide_number: Math.max(1, slideNumber),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('[updateLastPosition] Supabase error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('[updateLastPosition] Exception:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Records a student's confidence rating for a slide (1-5 scale)
 * This powers the Study Heatmap and Blind Spots analytics widgets.
 */
export async function submitConfidenceRating(slideId: string, rating: number) {
  try {
    if (!slideId || rating < 1 || rating > 5) {
      return { success: false, error: 'Invalid parameters' };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await (supabase.from('confidence_ratings') as any).insert({
      user_id: user.id,
      slide_id: slideId,
      rating: Math.round(rating),
      rated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[submitConfidenceRating] Supabase error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return { success: true };
  } catch (err: any) {
    console.error('[submitConfidenceRating] Exception:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Records a completed focus study session duration in study_sessions.
 * This directly feeds into Study Heatmap points, weekly minutes, and streaks.
 */
export async function recordStudySession(durationMinutes: number, courseId?: string) {
  try {
    if (durationMinutes <= 0) return { success: false, error: 'Invalid duration' };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const durationSecs = Math.round(durationMinutes * 60);
    const today = new Date().toISOString().split('T')[0];

    const { error } = await (supabase.from('study_sessions') as any).insert({
      user_id: user.id,
      course_id: courseId || null,
      duration_secs: durationSecs,
      duration_minutes: durationMinutes,
      session_date: today,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[recordStudySession] Supabase error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/analytics');
    return { success: true };
  } catch (err: any) {
    console.error('[recordStudySession] Exception:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}
