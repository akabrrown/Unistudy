'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Check, Loader2, Save, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function parseMcqContent(text: string): { stem: string; options: { letter: string; text: string }[] } {
  const optionRx = /(?:^|\n)[ \t]*([A-Ea-e])[.)][ \t]+(.+)/g
  const firstOptionIdx = text.search(/(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/)
  const stem = firstOptionIdx > -1 ? text.slice(0, firstOptionIdx).trim() : text.trim()
  const options: { letter: string; text: string }[] = []
  let m: RegExpExecArray | null
  while ((m = optionRx.exec(text)) !== null) {
    options.push({ letter: m[1].toUpperCase(), text: m[2].trim() })
  }
  return { stem, options }
}

export default function ExamAttempt() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const attemptId = searchParams.get('attemptId')
  
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(120 * 60) // 120 mins in seconds
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!attemptId) {
      router.push(`/dashboard/past-papers/${params.id}`)
      return
    }

    const fetchExam = async () => {
      // 1. Fetch questions via proxy API
      let qData: any[] | null = null
      try {
        const pData: any = await apiFetch(`/v1/past-questions/${params.id}`).catch(() => apiFetch(`/past-papers/${params.id}`))
        if (pData && Array.isArray(pData.past_paper_questions)) {
          qData = pData.past_paper_questions
        }
      } catch (proxyErr) {
        console.warn('Proxy fetch failed, using supabase fallback:', proxyErr)
      }

      if (!qData || qData.length === 0) {
        const { data: supaQ } = await supabase
          .from('past_paper_questions')
          .select('*')
          .eq('past_paper_id', params.id)
          .order('question_number', { ascending: true })
        qData = supaQ
      }

      // If still empty (e.g. newly opened official exam paper), auto-extract on demand
      if (!qData || qData.length === 0) {
        try {
          const extRes = await fetch(`/api/v1/past-questions/${params.id}/extract`, { method: 'POST' });
          if (extRes.ok) {
            const extData = await extRes.json();
            if (Array.isArray(extData.questions) && extData.questions.length > 0) {
              qData = extData.questions;
            }
          }
        } catch (extErr) {
          console.warn('[Attempt] Auto-extract notice:', extErr);
        }
      }
        
      if (qData) {
        let sortedQs = [...qData].sort((a, b) => 
          a.question_number.localeCompare(b.question_number, undefined, { numeric: true })
        )
        // Detect MCQs using the AI classification stored in extracted_topic, fallback to regex
        sortedQs = sortedQs.map(q => {
          const hasPrefix = q.extracted_topic && q.extracted_topic.includes('|')
          const isMcq = hasPrefix 
            ? q.extracted_topic.startsWith('MCQ|')
            : /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content)
            
          return isMcq ? { ...q, marks_available: 1, isMcq: true } : { ...q, isMcq: false }
        })
        setQuestions(sortedQs)
      }
      
      // Fetch attempt details to calculate time
      const { data: aData } = await supabase
        .from('past_paper_attempts')
        .select('started_at, time_limit_minutes')
        .eq('id', attemptId)
        .single()
        
      if (aData && aData.started_at) {
        const started = new Date(aData.started_at).getTime()
        const now = new Date().getTime()
        const elapsedSeconds = Math.floor((now - started) / 1000)
        const limitSeconds = (aData.time_limit_minutes || 120) * 60
        setTimeLeft(Math.max(0, limitSeconds - elapsedSeconds))
      }
    }
    
    fetchExam()
  }, [params.id, attemptId])

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit() // Auto-submit when time is up
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [qId]: text }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    
    // Save answers
    const inserts = questions.map((q, idx) => {
      let userAnswer = answers[q.id] || ''
      
      if (!userAnswer && !q.isMcq) {
        userAnswer = answers[q.id] || ''
      }

      return {
        attempt_id: attemptId,
        question_id: q.id,
        question_num: parseInt(q.question_number) || (idx + 1),
        user_answer_text: userAnswer,
        marks_awarded: null
      }
    })
    
    const { error: insertErr } = await supabase.from('past_paper_answers').insert(inserts)
    if (insertErr) {
      console.error("Failed to insert answers:", insertErr)
      alert("Failed to submit exam: " + insertErr.message)
      setSubmitting(false)
      return
    }
    
    // Mark attempt completed
    const { error: updateErr } = await supabase.from('past_paper_attempts').update({
      completed_at: new Date().toISOString()
    }).eq('id', attemptId)
    
    if (updateErr) {
      console.error("Failed to update attempt:", updateErr)
      alert("Failed to mark attempt as completed: " + updateErr.message)
      setSubmitting(false)
      return
    }

    router.push(`/dashboard/past-papers/results/${attemptId}`)
  }

  const mcqQuestions = questions.filter(q => q.isMcq)
  const theoryQuestions = questions.filter(q => !q.isMcq)
  const answeredCount = Object.keys(answers).filter(k => !!answers[k]).length

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24">
      {/* Sticky Header Examination Timer */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/80 py-3.5 -mx-4 px-4 sm:mx-0 sm:px-0 flex justify-between items-center shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#D89A06] bg-[#FEF8E7] dark:bg-white/5 px-2 py-0.5 rounded border border-[#D89A06]/30">
              EXAMINATION SIMULATION
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {answeredCount} / {questions.length} Attempted
            </span>
          </div>
          <h2 className="text-base font-bold text-foreground mt-0.5">Timed Candidate Paper</h2>
        </div>

        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-base font-bold border transition-colors ${
          timeLeft < 300 
            ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse' 
            : 'bg-[#00004E] text-[#D89A06] dark:bg-white/10 dark:text-[#D89A06] border-[#D89A06]/30'
        }`}>
          <Clock className="w-4 h-4 text-[#D89A06]" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Official University Examination Paper Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 space-y-4 shadow-xs text-center">
        <div className="space-y-1">
          <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            OFFICIAL UNIVERSITY EXAMINATION ARCHIVE
          </span>
          <h1 className="text-xl md:text-2xl font-black text-[#00004E] dark:text-white uppercase tracking-tight">
            FINAL / MID-SEMESTER EXAMINATION
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            Course Examination Paper · Duration: 2 Hours (120 Minutes)
          </p>
        </div>

        {/* Candidate Instructions */}
        <div className="rounded-xl border border-[#D89A06]/30 bg-[#FEF8E7]/40 dark:bg-white/5 p-4 text-left space-y-1.5 text-xs">
          <div className="font-bold text-[#00004E] dark:text-[#D89A06] uppercase tracking-wide text-[11px]">
            Instructions to Candidates:
          </div>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
            <li>Answer ALL questions in Section A (Multiple Choice Questions) directly on the interactive answer sheet.</li>
            <li>For Section B (Theory &amp; Essay Questions), provide complete derivations, formulas, and explanations.</li>
            <li>Workings for numerical computations must be clearly stated in the answer box.</li>
          </ul>
        </div>
      </header>

      <div className="space-y-10">
        {mcqQuestions.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
                SECTION A: OBJECTIVE QUESTIONS ({mcqQuestions.length} Questions)
              </h3>
              <span className="font-mono text-xs text-muted-foreground">1 Mark Each</span>
            </div>

            {mcqQuestions.map((q, idx) => (
              <Card key={q.id} className="border-border/80 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/60 py-3.5 px-5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold font-mono">
                      QUESTION {q.question_number}
                    </CardTitle>
                    <span className="text-[11px] font-mono font-bold text-[#D89A06] bg-[#FEF8E7] dark:bg-white/5 px-2 py-0.5 rounded border border-[#D89A06]/30">
                      [{q.marks_available} Mark]
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
                  {(() => {
                    const { stem, options } = parseMcqContent(q.text_content.replace(/<br\s*\/?>/gi, '\n'))
                    return (
                      <>
                        {stem && (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground font-medium leading-relaxed whitespace-pre-wrap [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stem}</ReactMarkdown>
                          </div>
                        )}

                        {options.length > 0 && (
                          <div className="space-y-2.5 pt-2">
                            {options.map(opt => {
                              const isSelected = answers[q.id] === opt.letter;
                              return (
                                <div
                                  key={opt.letter}
                                  onClick={() => handleAnswerChange(q.id, opt.letter)}
                                  className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-xs sm:text-sm cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-[#00004E] dark:border-[#D89A06] bg-[#FEF8E7]/50 dark:bg-white/5 shadow-2xs'
                                      : 'border-border/80 bg-card hover:border-[#D89A06]/60 hover:bg-muted/20'
                                  }`}
                                >
                                  <div className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-lg font-mono font-bold text-xs border ${
                                    isSelected
                                      ? 'bg-[#00004E] text-[#D89A06] border-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E]'
                                      : 'bg-muted text-muted-foreground border-border'
                                  }`}>
                                    {opt.letter}
                                  </div>
                                  <div className="text-foreground leading-relaxed pt-0.5">{opt.text}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {theoryQuestions.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
                SECTION B: THEORY &amp; CALCULATIONS ({theoryQuestions.length} Questions)
              </h3>
              <span className="font-mono text-xs text-muted-foreground">Show Detailed Workings</span>
            </div>

            {theoryQuestions.map((q) => (
              <Card key={q.id} className="border-border/80 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/60 py-3.5 px-5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold font-mono">
                      QUESTION {q.question_number}
                    </CardTitle>
                    <span className="text-[11px] font-mono font-bold text-[#D89A06] bg-[#FEF8E7] dark:bg-white/5 px-2 py-0.5 rounded border border-[#D89A06]/30">
                      [{q.marks_available || 10} Marks]
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground font-medium leading-relaxed whitespace-pre-wrap [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {q.text_content.replace(/<br\s*\/?>/gi, '\n')}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                      <span>Candidate Written Solution</span>
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-[#00004E] dark:text-[#D89A06] cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5" /> Scan Handwriting
                      </Button>
                    </div>
                    <Textarea 
                      placeholder="Type your structured solution here. Clearly label sub-questions (e.g., (a), (b), (i), (ii)) and show step-by-step arithmetic."
                      className="min-h-[220px] font-mono text-xs leading-relaxed resize-y rounded-xl border-border/80 p-3.5"
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-border/80 mt-10">
        <span className="text-xs text-muted-foreground">
          {answeredCount} of {questions.length} questions answered
        </span>
        <Button 
          onClick={handleSubmit} 
          disabled={submitting || questions.length === 0} 
          className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-8 h-10 font-bold shadow-md cursor-pointer text-xs"
        >
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting for AI Marking...</> : <><Check className="w-4 h-4 mr-2" /> Finish &amp; Submit Paper</>}
        </Button>
      </div>
    </div>
  )
}
