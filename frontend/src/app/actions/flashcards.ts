'use server'

import { createClient } from '@/lib/supabase/server'
import { Rating, calculateNextReview } from '@/lib/utils/sm2'

export async function generateFlashcards(lectureId: string) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
    
    // 1. Try Express backend if session token exists
    if (session?.access_token) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/flashcards/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ lectureId })
        })

        const data = await res.json()
        if (res.ok) {
          return { success: true, count: data.count }
        }
        if (res.status === 402) {
          return { error: 'quota_exceeded', reason: data.reason }
        }
        console.warn('[Flashcards Action] Backend generation returned non-OK, falling back to direct server generation:', data.error)
      } catch (backendFetchErr: any) {
        console.warn('[Flashcards Action] Backend generation fetch failed, falling back to direct server generation:', backendFetchErr.message)
      }
    }

    // 2. Server-side direct fallback: Query slides and extract flashcards
    const { data: slides, error: slidesErr } = await supabase
      .from('slides')
      .select('raw_text, explanation, slide_number')
      .eq('lecture_id', lectureId)
      .order('slide_number', { ascending: true })

    if (slidesErr) {
      console.error('[Flashcards Action] Slides fetch error:', slidesErr)
      return { error: 'Failed to fetch slides: ' + slidesErr.message }
    }

    if (!slides || slides.length === 0) {
      return { error: 'No slides found for this lecture. Ensure the file was processed completely.' }
    }

    const cards: { front: string; back: string }[] = []
    const seen = new Set<string>()

    for (const s of slides) {
      const text = (s.raw_text || '').trim()
      const exp = (s.explanation || '').trim()
      if (!text && !exp) continue

      const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)

      for (const line of lines) {
        const defMatch = line.match(/^([A-Z0-9\s/_-]{3,40})\s*[:–—]\s*(.{15,})$/)
        if (defMatch) {
          const front = `What is ${defMatch[1].trim()}?`
          const back = defMatch[2].trim()
          if (!seen.has(front.toLowerCase())) {
            seen.add(front.toLowerCase())
            cards.push({ front, back })
          }
        }
      }

      for (let i = 0; i < lines.length - 1; i++) {
        const current = lines[i]
        const next = lines[i + 1]
        if (
          current.length >= 3 &&
          current.length <= 40 &&
          !current.endsWith('.') &&
          next.length >= 20 &&
          !next.startsWith('BSIT') &&
          !next.startsWith('Department')
        ) {
          const front = `Define ${current}`
          const back = next
          if (!seen.has(front.toLowerCase()) && cards.length < 20) {
            seen.add(front.toLowerCase())
            cards.push({ front, back })
          }
        }
      }

      if (exp && exp.length > 25 && lines.length > 0) {
        const heading = lines.find((l: string) => l.length > 4 && l.length < 60 && !l.includes('•') && !l.startsWith('Department')) || `Slide ${s.slide_number} Concept`
        const front = `Key concept: ${heading}`
        const back = exp.length > 250 ? exp.slice(0, 250) + '...' : exp
        if (!seen.has(front.toLowerCase()) && cards.length < 20) {
          seen.add(front.toLowerCase())
          cards.push({ front, back })
        }
      }
    }

    if (cards.length === 0) {
      return { error: 'Could not extract flashcards from these slides.' }
    }

    // Delete existing cards for this lecture
    await supabase.from('flashcards').delete().eq('lecture_id', lectureId).eq('user_id', user.id)

    const cardsToInsert = cards.slice(0, 15).map(c => ({
      user_id: user.id,
      lecture_id: lectureId,
      front: c.front,
      back: c.back,
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      next_review: new Date().toISOString()
    }))

    const { error: insertErr } = await supabase.from('flashcards').insert(cardsToInsert)
    if (insertErr) {
      console.error('[Flashcards Action] Insert error:', insertErr)
      return { error: 'Failed to save flashcards: ' + insertErr.message }
    }

    return { success: true, count: cardsToInsert.length }
  } catch (err: any) {
    console.error('generateFlashcards exception:', err)
    return { error: 'An unexpected error occurred: ' + err.message }
  }
}

export async function getFlashcards(lectureIds: string[]) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Unauthorized' }
  
  try {
    if (session?.access_token) {
      const res = await fetch(`${BACKEND_URL}/api/flashcards?lectureIds=${lectureIds.join(',')}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data) && json.data.length > 0) {
          return { data: json.data }
        }
      }
    }
  } catch (e: any) {
    // Backend fetch failed, proceed to direct Supabase query
  }

  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .in('lecture_id', lectureIds)

    if (error) return { error: error.message }
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function submitFlashcardReview(cardId: string, rating: Rating, currentData: { ease_factor: number, interval_days: number, repetitions: number }) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    if (session?.access_token) {
      const res = await fetch(`${BACKEND_URL}/api/flashcards/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ cardId, rating, currentData })
      })
      
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          const { revalidatePath } = await import('next/cache')
          revalidatePath('/dashboard', 'layout')
          return { success: true, nextData: json.nextData }
        }
      }
    }
  } catch (err: any) {
    // Backend fetch failed, proceed to direct Supabase update
  }

  try {
    const nextData = calculateNextReview(currentData, rating)
    const { error } = await supabase
      .from('flashcards')
      .update({
        ease_factor: nextData.ease_factor,
        interval_days: nextData.interval_days,
        repetitions: nextData.repetitions,
        next_review: nextData.next_review.toISOString()
      })
      .eq('id', cardId)

    if (error) return { error: error.message }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard', 'layout')
    return { success: true, nextData }
  } catch (err: any) {
    return { error: err.message }
  }
}
