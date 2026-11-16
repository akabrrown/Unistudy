'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteLecture(lectureId: string, courseId: string) {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
  try {
    const res = await fetch(`${BACKEND_URL}/api/lectures/${lectureId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Failed to delete lecture' }
    }

    // Revalidate the course and lectures pages so lists update
    revalidatePath(`/dashboard/courses/${courseId}`)
    revalidatePath('/dashboard/lectures')
    return { success: true }
  } catch (err: any) {
    console.error('Failed to delete lecture:', err)
    return { success: false, error: err.message }
  }
}

export async function bulkDeleteLectures(lectureIds: string[], courseId?: string) {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
  try {
    const res = await fetch(`${BACKEND_URL}/api/lectures/bulk-delete`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lectureIds })
    });

    if (!res.ok) {
      // Fallback directly to Supabase client if backend endpoint is waking or unavailable
      const { error: sbErr } = await supabase.from('lectures').delete().in('id', lectureIds);
      if (sbErr) {
        return { success: false, error: sbErr.message || 'Failed to bulk delete lectures' };
      }
    }

    if (courseId) {
      revalidatePath(`/dashboard/courses/${courseId}`);
    }
    revalidatePath('/dashboard/lectures');
    return { success: true };
  } catch (err: any) {
    // Direct Supabase fallback on network exception
    try {
      const { error: sbErr } = await supabase.from('lectures').delete().in('id', lectureIds);
      if (sbErr) throw sbErr;
      if (courseId) revalidatePath(`/dashboard/courses/${courseId}`);
      revalidatePath('/dashboard/lectures');
      return { success: true };
    } catch (e: any) {
      console.error('Failed to bulk delete lectures:', e || err);
      return { success: false, error: e?.message || err?.message || 'Failed to bulk delete lectures' };
    }
  }
}
