'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { Rating, calculateNextReview } from '@/lib/utils/sm2'
import {
  GEMINI_CANDIDATE_MODELS,
  GROQ_SMART_MODELS,
  OPENROUTER_CANDIDATE_MODELS,
} from '../../../../shared/constants/aiModels'
import {
  buildGroundedFlashcardPrompt,
  extractFlashcardsFromSlides,
  parseFlashcardsJson,
  type FlashcardItem,
  type SlideFlashcardInput,
} from '../../../../shared/lib/flashcardExtractor'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function generateFlashcardsWithAI(slidesInput: SlideFlashcardInput[] | string): Promise<FlashcardItem[]> {
  const prompt = buildGroundedFlashcardPrompt(slidesInput)

  // 1. Try Groq
  if (process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    for (const model of GROQ_SMART_MODELS) {
      try {
        const res = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        })
        const cards = parseFlashcardsJson(res.choices[0]?.message?.content || '')
        if (cards.length > 0) return cards.slice(0, 15)
      } catch (err: unknown) {
        console.warn(`[Flashcards] Groq ${model} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }

  // 2. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    for (const modelName of GEMINI_CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        })
        const result = await model.generateContent(prompt)
        const cards = parseFlashcardsJson(result.response.text())
        if (cards.length > 0) return cards.slice(0, 15)
      } catch (err: unknown) {
        console.warn(`[Flashcards] Gemini ${modelName} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }

  // 3. Try OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
        })
        if (res.ok) {
          const json = await res.json()
          const cards = parseFlashcardsJson(json.choices?.[0]?.message?.content || '')
          if (cards.length > 0) return cards.slice(0, 15)
        }
      } catch (err: unknown) {
        console.warn(`[Flashcards] OpenRouter ${model} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }

  return []
}

export async function generateFlashcards(lectureId: string) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const admin = getAdminClient()

    // Verify lecture ownership before reading or writing
    const { data: lectureRow } = await supabase
      .from('lectures')
      .select('id, title, course_id, courses!inner(user_id)')
      .eq('id', lectureId)
      .single()

    if (!lectureRow && admin) {
      const { data: adminLec } = await admin
        .from('lectures')
        .select('id, course_id, courses!inner(user_id)')
        .eq('id', lectureId)
        .single()
      const ownerId = (adminLec?.courses as unknown as { user_id?: string })?.user_id
      if (!adminLec || ownerId !== user.id) {
        return { error: 'Lecture not found or access denied' }
      }
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'

    // 1. Try Express backend if reachable
    if (session?.access_token) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/flashcards/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ lectureId }),
          signal: AbortSignal.timeout(8000),
        })

        const data = await res.json()
        if (res.ok && data.count > 0) {
          // Fetch newly stored cards via our verified getter so frontend always receives real DB rows
          const refreshed = await getFlashcards([lectureId])
          return {
            success: true,
            count: data.count,
            cards: refreshed.data || [],
          }
        }
        if (res.status === 402) {
          return { error: 'quota_exceeded', reason: data.reason }
        }
        console.warn('[Flashcards Action] Backend returned non-OK, falling back to Next.js generation:', data.error)
      } catch (backendFetchErr: unknown) {
        console.warn(
          '[Flashcards Action] Backend fetch failed, using Next.js server generation:',
          backendFetchErr instanceof Error ? backendFetchErr.message : backendFetchErr
        )
      }
    }

    // 2. Server-side direct generation: Query slides
    let { data: slides, error: slidesErr } = await supabase
      .from('slides')
      .select('raw_text, explanation, slide_number')
      .eq('lecture_id', lectureId)
      .order('slide_number', { ascending: true })

    if ((slidesErr || !slides || slides.length === 0) && admin) {
      const adminSlides = await admin
        .from('slides')
        .select('raw_text, explanation, slide_number')
        .eq('lecture_id', lectureId)
        .order('slide_number', { ascending: true })
      if (!adminSlides.error && adminSlides.data) {
        slides = adminSlides.data
        slidesErr = null
      }
    }

    if (slidesErr) {
      console.error('[Flashcards Action] Slides fetch error:', slidesErr)
      return { error: 'Failed to fetch slides: ' + slidesErr.message }
    }

    if (!slides || slides.length === 0) {
      return { error: 'No slides found for this lecture. Ensure the file was processed completely.' }
    }

    let generatedCards = await generateFlashcardsWithAI(slides)
    if (generatedCards.length === 0) {
      generatedCards = extractFlashcardsFromSlides(slides)
    }

    if (generatedCards.length === 0) {
      return { error: 'Could not extract flashcards from these slides.' }
    }

    // Delete existing cards for this lecture owned by this user
    const delClient = admin || supabase
    await delClient.from('flashcards').delete().eq('lecture_id', lectureId).eq('user_id', user.id)

    const nowIso = new Date().toISOString()
    const cardsToInsert = generatedCards.slice(0, 15).map((c) => ({
      user_id: user.id,
      lecture_id: lectureId,
      front: c.front,
      back: c.back,
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      next_review: nowIso,
    }))

    let insertedRows: Record<string, unknown>[] | null = null
    const { data: userInsertData, error: userInsertErr } = await supabase
      .from('flashcards')
      .insert(cardsToInsert)
      .select('*')

    if (!userInsertErr && userInsertData && userInsertData.length > 0) {
      insertedRows = userInsertData
    } else if (admin) {
      const { data: adminInsertData, error: adminInsertErr } = await admin
        .from('flashcards')
        .insert(cardsToInsert)
        .select('*')
      if (adminInsertErr) {
        console.error('[Flashcards Action] Admin insert error:', adminInsertErr)
        return { error: 'Failed to save flashcards: ' + adminInsertErr.message }
      }
      insertedRows = adminInsertData
    } else if (userInsertErr) {
      return { error: 'Failed to save flashcards: ' + userInsertErr.message }
    }

    return {
      success: true,
      count: (insertedRows || cardsToInsert).length,
      cards: insertedRows || cardsToInsert,
    }
  } catch (err: unknown) {
    console.error('generateFlashcards exception:', err)
    return { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : String(err)) }
  }
}

export async function getFlashcards(lectureIds: string[]) {
  if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
    return { data: [] }
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    if (session?.access_token) {
      const res = await fetch(`${BACKEND_URL}/api/flashcards?lectureIds=${lectureIds.join(',')}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data) && json.data.length > 0) {
          return { data: json.data }
        }
      }
    }
  } catch {
    // Backend fetch failed, proceed to Supabase query
  }

  try {
    const { data: userData, error: userErr } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', user.id)
      .in('lecture_id', lectureIds)

    if (!userErr && Array.isArray(userData) && userData.length > 0) {
      return { data: userData }
    }

    // Fallback to service role scoped strictly to authenticated user.id if RLS blocks user SELECT
    const admin = getAdminClient()
    if (admin) {
      const { data: adminData, error: adminErr } = await admin
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .in('lecture_id', lectureIds)

      if (adminErr) return { error: adminErr.message }
      return { data: adminData || [] }
    }

    if (userErr) return { error: userErr.message }
    return { data: userData || [] }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function submitFlashcardReview(
  cardId: string,
  rating: Rating,
  currentData: { ease_factor: number; interval_days: number; repetitions: number }
) {
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
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ cardId, rating, currentData }),
        signal: AbortSignal.timeout(4000),
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
  } catch {
    // Backend fetch failed, proceed to Supabase update
  }

  try {
    const nextData = calculateNextReview(currentData, rating)
    const updatePayload = {
      ease_factor: nextData.ease_factor,
      interval_days: nextData.interval_days,
      repetitions: nextData.repetitions,
      next_review: nextData.next_review.toISOString(),
    }

    const { data: updatedUserRow, error: userUpdateErr } = await supabase
      .from('flashcards')
      .update(updatePayload)
      .eq('id', cardId)
      .eq('user_id', user.id)
      .select('id')

    if (userUpdateErr || !updatedUserRow || updatedUserRow.length === 0) {
      const admin = getAdminClient()
      if (admin) {
        const { error: adminUpdateErr } = await admin
          .from('flashcards')
          .update(updatePayload)
          .eq('id', cardId)
          .eq('user_id', user.id)

        if (adminUpdateErr) return { error: adminUpdateErr.message }
      } else if (userUpdateErr) {
        return { error: userUpdateErr.message }
      }
    }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard', 'layout')
    return { success: true, nextData }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
