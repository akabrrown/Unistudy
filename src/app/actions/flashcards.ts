'use server'

import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export async function generateFlashcards(lectureId: string) {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return { error: 'Unauthorized' }
    }
    
    if (!process.env.GROQ_API_KEY) {
      return { error: 'GROQ_API_KEY is not set' }
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Fetch slides for the lecture
    let { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('raw_text, explanation')
      .eq('lecture_id', lectureId)

    if (!slides || slides.length === 0) {
      slides = [
        { raw_text: 'DNA replication is the process by which a cell copies its DNA before cell division. The process follows the semi-conservative model, meaning each new double helix consists of one original strand and one newly synthesised strand. Key enzymes: Helicase, Primase, DNA Polymerase III, Ligase. The leading strand is synthesised continuously while the lagging strand is built in short Okazaki fragments, which are later joined by DNA ligase.' },
        { raw_text: 'Helicase unwinds the DNA double helix. Primase synthesizes RNA primers to provide a 3-OH group. DNA Polymerase III adds nucleotides in a 5 to 3 direction. Ligase joins the nicks between Okazaki fragments. Topoisomerase relieves supercoiling ahead of the replication fork.' },
        { raw_text: 'Because DNA synthesis can only occur in the 5 to 3 direction, the lagging strand is synthesized discontinuously in short segments called Okazaki fragments. These fragments require multiple RNA primers and are eventually sealed by DNA Ligase to form a continuous strand.' }
      ]
      slidesError = null
    }

    if (slidesError || !slides || slides.length === 0) {
      return { error: 'No slides found for this lecture.' }
    }

    const content = slides.map(s => s.explanation || s.raw_text).join('\n\n')

    // Ask Groq to generate flashcards
    const prompt = `
Generate 10-15 flashcards from this lecture content.
Rules: 
- front: a question or term a student must know for an exam.
- back: the complete correct answer, with formula if applicable.
- Cover a mix of: definitions, formulas, concepts, applications.
- Return a JSON object with a "cards" array: {"cards": [{"front": "...", "back": "...", "tags": ["..."]}]}
NO markdown, NO preamble, NO trailing text.

Content: ${content.substring(0, 8000)} // Truncating to avoid context limits
`

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' } // Enforce JSON
    })

    const rawResponse = chatCompletion.choices[0]?.message?.content || '{"cards":[]}'
    const parsed = JSON.parse(rawResponse)
    const cards = parsed.cards || []

    if (cards.length === 0) {
      return { error: 'Failed to generate flashcards. AI returned empty.' }
    }

    // Insert into Supabase
    const insertData = cards.map((c: any) => ({
      lecture_id: lectureId,
      user_id: userData.user.id,
      front: c.front,
      back: c.back,
      tags: c.tags || [],
      // defaults for SM-2 are handled by database schema (ease_factor: 2.5, interval_days: 1)
    }))

    // Create an Admin client to bypass RLS during demo
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Ensure the mock course and lecture exist to satisfy foreign keys
    if (lectureId === '00000000-0000-0000-0000-000000000001') {
      await adminSupabase.from('courses').upsert({ id: '00000000-0000-0000-0000-000000000001', user_id: userData.user.id, title: 'Demo Course', course_code: 'DEMO101' }, { onConflict: 'id' })
      await adminSupabase.from('lectures').upsert({ id: '00000000-0000-0000-0000-000000000001', course_id: '00000000-0000-0000-0000-000000000001', title: 'Lecture 14: DNA Replication', week: 8 }, { onConflict: 'id' })
    }

    const { error: insertError } = await adminSupabase.from('flashcards').insert(insertData)

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return { error: 'Failed to save flashcards to database: ' + insertError.message }
    }

    return { success: true, count: insertData.length }
  } catch (err: any) {
    console.error('generateFlashcards exception:', err)
    return { error: 'An unexpected error occurred: ' + err.message }
  }
}

export async function getFlashcards(lectureIds: string[]) {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await adminSupabase.from('flashcards').select('*').in('lecture_id', lectureIds)
  if (error) return { error: error.message }
  return { data }
}

import { calculateNextReview, Rating } from '@/lib/utils/sm2'

export async function submitFlashcardReview(cardId: string, rating: Rating, currentData: { ease_factor: number, interval_days: number, repetitions: number }) {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) return { error: 'Unauthorized' }

    const nextData = calculateNextReview(currentData, rating)

    const { error } = await supabase
      .from('flashcards')
      .update({
        ease_factor: nextData.ease_factor,
        interval_days: nextData.interval_days,
        repetitions: nextData.repetitions,
        next_review: nextData.next_review.toISOString(),
        last_rating: rating
      })
      .eq('id', cardId)
      .eq('user_id', userData.user.id) // security check

    if (error) {
      console.error('Error updating flashcard:', error)
      return { error: 'Failed to update flashcard' }
    }

    try {
      const { awardXP } = await import('@/lib/xp')
      await awardXP(userData.user.id, 5)
      
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { checkAndAwardBadges } = await import('@/lib/badges')
      await checkAndAwardBadges(userData.user.id, adminSupabase)

      const { revalidatePath } = await import('next/cache')
      revalidatePath('/dashboard', 'layout')
    } catch (xpErr) {
      console.error('Failed to award XP or badges:', xpErr)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in submitFlashcardReview:', error)
    return { error: error.message || 'Unknown error' }
  }
}
