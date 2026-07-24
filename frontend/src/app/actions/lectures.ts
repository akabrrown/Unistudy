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

    // Revalidate the course page so the list updates
    revalidatePath(`/dashboard/courses/${courseId}`)
    return { success: true }
  } catch (err: any) {
    console.error('Failed to delete lecture:', err)
    return { success: false, error: err.message }
  }
}

export async function bulkDeleteLectures(lectureIds: string[], courseId: string) {
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
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Failed to bulk delete lectures' }
    }

    revalidatePath(`/dashboard/courses/${courseId}`)
    return { success: true }
  } catch (err: any) {
    console.error('Failed to bulk delete lectures:', err)
    return { success: false, error: err.message }
  }
}
