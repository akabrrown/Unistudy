'use server'

import { createClient } from '@/lib/supabase/server'
import { executeWithRotation } from '@/lib/ai/keyManager'

export async function generateQuiz(lectureId: string, questionCount: number = 5) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { error: 'Unauthorized' }
    }
    
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
    const res = await fetch(`${BACKEND_URL}/api/quizzes/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ lectureId, questionCount })
    })

    const data = await res.json()
    if (!res.ok) {
      if (res.status === 402) return { error: 'quota_exceeded', reason: data.reason }
      return { error: data.error || 'Failed to generate quiz' }
    }

    return { success: true, count: Array.isArray(data) ? data.length : data?.count || 0 }
  } catch (err: any) {
    console.error('generateQuiz exception:', err)
    return { error: 'An unexpected error occurred: ' + err.message }
  }
}

export async function getQuizzes(lectureIds: string[]) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) return { error: 'Unauthorized' }
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/quizzes?lectureIds=${lectureIds.join(',')}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      cache: 'no-store'
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'Failed to fetch quizzes' }
    return { data: json.data }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function submitQuizAttempt(lectureId: string, score: number, total: number, timeTaken: number) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) return { error: 'Unauthorized' }

  try {
    const res = await fetch(`${BACKEND_URL}/api/quizzes/attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ lectureId, score, total, timeTaken })
    })
    
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'Failed to record attempt' }

    if (json.xpEarned) {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/dashboard', 'layout')
    }

    return { success: true, xpEarned: json.xpEarned }
  } catch (err: any) {
    return { error: err.message }
  }
}
