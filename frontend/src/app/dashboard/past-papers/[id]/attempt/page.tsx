'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Check, Loader2, Save, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const OPTION_LETTER_STYLES: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
  B: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  D: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
  E: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
}

const OPTION_ROW_STYLES: Record<string, string> = {
  A: 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20',
  B: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20',
  C: 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20',
  D: 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20',
  E: 'border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20',
}

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
      // Fetch questions
      const { data: qData } = await supabase
        .from('past_paper_questions')
        .select('*')
        .eq('past_paper_id', params.id)
        .order('question_number', { ascending: true })
        
      if (qData) {
        let sortedQs = [...qData].sort((a, b) => 
          a.question_number.localeCompare(b.question_number, undefined, { numeric: true })
        )
        // Detect MCQs by presence of labelled options; always override to 1 mark
        sortedQs = sortedQs.map(q => {
          const isMcq = /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content)
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
    const inserts = questions.map(q => ({
      attempt_id: attemptId,
      question_id: q.id,
      user_answer_text: answers[q.id] || '',
      marks_awarded: null
    }))
    
    await supabase.from('past_paper_answers').insert(inserts)
    
    // Mark attempt completed
    await supabase.from('past_paper_attempts').update({
      completed_at: new Date().toISOString()
    }).eq('id', attemptId)

    router.push(`/dashboard/past-papers/results/${attemptId}`)
  }

  const mcqQuestions = questions.filter(q => q.isMcq)
  const theoryQuestions = questions.filter(q => !q.isMcq)

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Sticky Header Timer */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border py-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Exam in Progress</h2>
          <p className="text-sm text-muted-foreground">Keep your eyes on the clock.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold shadow-sm ${timeLeft < 300 ? 'bg-destructive/10 text-destructive border border-destructive/20 animate-pulse' : 'bg-muted border border-border'}`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="space-y-8">
        {mcqQuestions.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground border-b border-border pb-2">Multiple Choice Questions</h3>
            {mcqQuestions.map((q, idx) => (
              <Card key={q.id} className="border-border shadow-sm">
                <CardHeader className="bg-muted/10 border-b border-border pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Question {q.question_number}</CardTitle>
                    <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {q.marks_available} Marks
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {(() => {
                    const { stem, options } = parseMcqContent(q.text_content)
                    return (
                      <>
                        {stem && (
                          <div className="prose prose-sm dark:prose-invert max-w-none mb-5 [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stem}</ReactMarkdown>
                          </div>
                        )}

                        {options.length > 0 && (
                          <div className="space-y-2 mb-6">
                            {options.map(opt => (
                              <div
                                key={opt.letter}
                                className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${OPTION_ROW_STYLES[opt.letter] ?? 'border-border bg-muted/20'}`}
                              >
                                <span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded font-bold text-xs ${OPTION_LETTER_STYLES[opt.letter] ?? 'bg-muted text-foreground'}`}>
                                  {opt.letter}
                                </span>
                                <span className="text-foreground/90 leading-relaxed">{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Your answer</label>
                          <Textarea
                            placeholder="Enter the letter of your choice (e.g. A)"
                            className="min-h-[56px] font-mono text-sm resize-none uppercase"
                            maxLength={1}
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value.toUpperCase())}
                          />
                        </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {theoryQuestions.length > 0 && (
          <div className="space-y-6 mt-12">
            <h3 className="text-xl font-bold text-foreground border-b border-border pb-2">Theory & Essay Questions</h3>
            {theoryQuestions.map((q, idx) => (
              <Card key={q.id} className="border-border shadow-sm">
                <CardHeader className="bg-muted/10 border-b border-border pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Question {q.question_number}</CardTitle>
                    <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {q.marks_available} Marks
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-6 [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {q.text_content}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Your Answer
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs">
                        <UploadCloud className="w-3 h-3" /> Upload Handwriting
                      </Button>
                    </label>
                    <Textarea 
                      placeholder="Type your detailed answer here..."
                      className="min-h-[150px] font-mono text-sm resize-y"
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t border-border mt-10">
        <Button onClick={handleSubmit} disabled={submitting || questions.length === 0} size="lg" className="px-8 shadow-lg shadow-primary/20">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4 mr-2" /> Submit Exam</>}
        </Button>
      </div>
    </div>
  )
}
