'use server'

import { createClient } from '@/lib/supabase/server'
import { executeWithRotation } from '@/lib/ai/keyManager'

export async function generateFlashcards(lectureId: string) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { error: 'Unauthorized' }
    }
    
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
    const res = await fetch(`${BACKEND_URL}/api/flashcards/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ lectureId })
    })

    const data = await res.json()
    if (!res.ok) {
      if (res.status === 402) return { error: 'quota_exceeded', reason: data.reason }
      return { error: data.error || 'Failed to generate flashcards' }
    }

    return { success: true, count: data.count }
  } catch (err: any) {
    console.error('generateFlashcards exception:', err)
    return { error: 'An unexpected error occurred: ' + err.message }
  }
}

export async function getFlashcards(lectureIds: string[]) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) return { error: 'Unauthorized' }
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/flashcards?lectureIds=${lectureIds.join(',')}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      cache: 'no-store'
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'Failed to fetch flashcards' }
    return { data: json.data }
  } catch (e: any) {
    return { error: e.message }
  }
}

import { Rating } from '@/lib/utils/sm2'

export async function submitFlashcardReview(cardId: string, rating: Rating, currentData: { ease_factor: number, interval_days: number, repetitions: number }) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) return { error: 'Unauthorized' }

  try {
    const res = await fetch(`${BACKEND_URL}/api/flashcards/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ cardId, rating, currentData })
    })
    
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'Failed to record review' }

    if (json.success) {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/dashboard', 'layout')
    }

    return { success: true, nextData: json.nextData }
  } catch (err: any) {
    return { error: err.message }
  }
}
