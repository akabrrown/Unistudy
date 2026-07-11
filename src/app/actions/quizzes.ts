'use server'

import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export async function generateQuiz(lectureId: string, questionCount: number = 5) {
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

    // Ask Groq to generate quiz questions
    const prompt = `
Generate exactly ${questionCount} exam-quality Multiple Choice Questions (MCQ) from this lecture content.
Rules:
- Each question must have exactly 4 options (labelled A, B, C, D).
- One and only one option must be correct.
- Provide a 1-sentence explanation for why the correct option is right.
- Return a JSON object with a "questions" array: 
  {
    "questions": [
      {
        "question": "...", 
        "options": [
          {"label": "A", "text": "..."}, 
          {"label": "B", "text": "..."}, 
          {"label": "C", "text": "..."}, 
          {"label": "D", "text": "..."}
        ],
        "correct_option": "B",
        "explanation": "..."
      }
    ]
  }
NO markdown, NO preamble, NO trailing text.

Content: ${content.substring(0, 8000)}
`

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    })

    const rawResponse = chatCompletion.choices[0]?.message?.content || '{"questions":[]}'
    const parsed = JSON.parse(rawResponse)
    const questions = parsed.questions || []

    if (questions.length === 0) {
      return { error: 'Failed to generate quiz questions. AI returned empty.' }
    }

    // Insert into Supabase
    const insertData = questions.map((q: any) => ({
      lecture_id: lectureId,
      question: q.question,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      difficulty: 5,
      type: 'mcq'
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

    const { error: insertError } = await adminSupabase.from('quiz_questions').insert(insertData)

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return { error: 'Failed to save quiz questions to database: ' + insertError.message }
    }

    return { success: true, count: insertData.length }
  } catch (err: any) {
    console.error('generateQuiz exception:', err)
    return { error: 'An unexpected error occurred: ' + err.message }
  }
}

export async function getQuizzes(lectureIds: string[]) {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await adminSupabase.from('quiz_questions').select('*').in('lecture_id', lectureIds)
  if (error) return { error: error.message }
  return { data }
}

export async function submitQuizAttempt(lectureId: string, score: number, total: number, timeTaken: number) {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return { error: 'Unauthorized' }
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: insertError } = await adminSupabase.from('quiz_attempts').insert({
      user_id: userData.user.id,
      lecture_id: lectureId,
      score,
      total,
      time_taken: timeTaken
    })

    if (insertError) {
      console.error('Failed to insert quiz attempt:', insertError)
      return { error: 'Failed to record attempt.' }
    }

    // Award XP based on correct answers (e.g. 10 XP per correct answer)
    const correctCount = Math.round((score / 100) * total);
    let xpEarned = correctCount * 10;
    
    // Bonus for perfect score
    if (score === 100) xpEarned += 50;

    if (xpEarned > 0) {
      const { awardXP } = await import('@/lib/xp')
      await awardXP(userData.user.id, xpEarned)
      
      try {
        const { checkAndAwardBadges } = await import('@/lib/badges')
        await checkAndAwardBadges(userData.user.id, adminSupabase)
      } catch (badgeErr) {
        console.error('Failed to check badges:', badgeErr)
      }

      const { revalidatePath } = await import('next/cache')
      revalidatePath('/dashboard', 'layout')
    }

    return { success: true, xpEarned }
  } catch (err: any) {
    return { error: err.message }
  }
}
