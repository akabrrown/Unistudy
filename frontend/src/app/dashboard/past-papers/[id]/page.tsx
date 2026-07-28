'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, FileText, Bot, FileQuestion, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
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

export default function PastPaperDetails() {
  const params = useParams()
  const router = useRouter()
  const [paper, setPaper] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      
      const { data: pData } = await supabase
        .from('past_papers')
        .select('*, courses(course_code, title)')
        .eq('id', params.id)
        .single()
        
      if (pData) {
        setPaper(pData)
        
        const { data: qData } = await supabase
          .from('past_paper_questions')
          .select('*')
          .eq('past_paper_id', pData.id)
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
      }
      
      setLoading(false)
    }
    
    if (params.id) {
      fetchDetails()
    }
  }, [params.id])

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-8 w-1/4 bg-muted/50 rounded"></div>
      <div className="h-32 bg-muted/50 rounded-xl"></div>
      <div className="h-64 bg-muted/50 rounded-xl"></div>
    </div>
  }

  if (!paper) {
    return <div className="text-center py-12">Past paper not found.</div>
  }

  const startAttempt = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('past_paper_attempts')
      .insert({
        past_paper_id: paper.id,
        user_id: session.user.id,
        time_limit_minutes: 120 // Default 2 hrs, could be dynamic
      })
      .select()
      .single()

    if (!error && data) {
      router.push(`/dashboard/past-papers/${paper.id}/attempt?attemptId=${data.id}`)
    }
  }

  const mcqQuestions = questions.filter(q => q.isMcq)
  const theoryQuestions = questions.filter(q => !q.isMcq)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/dashboard/past-papers">
        <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Bank
        </Button>
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {paper.courses?.course_code || 'Unknown Course'} 
            </h1>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {paper.year}
            </span>
            <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium capitalize">
              {paper.exam_type}
            </span>
          </div>
          <p className="text-muted-foreground">{paper.courses?.course_name}</p>
        </div>
        <Button onClick={startAttempt} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          Start Attempt <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-primary" /> Questions ({questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paper.status === 'processing' ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                <Bot className="w-8 h-8 mb-3 animate-pulse text-purple-500" />
                <p>AI is currently extracting questions from the PDF...</p>
                <p className="text-sm mt-1 opacity-70">This usually takes about 30-60 seconds.</p>
              </div>
            ) : questions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border">
                No questions found. The AI might have failed to parse this paper.
              </p>
            ) : (
              <div className="space-y-8">
                {mcqQuestions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">Multiple Choice Questions</h3>
                    {mcqQuestions.map((q) => (
                      <div key={q.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-foreground">Question {q.question_number}</span>
                          <span className="text-sm font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
                            {q.marks_available} marks
                          </span>
                        </div>
                        <div className="text-sm text-foreground/80">
                          {(() => {
                            const { stem, options } = parseMcqContent(q.text_content)
                            return (
                              <>
                                {stem && (
                                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4 [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{stem}</ReactMarkdown>
                                  </div>
                                )}
                                {options.length > 0 && (
                                  <div className="space-y-1.5">
                                    {options.map(opt => (
                                      <div
                                        key={opt.letter}
                                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${OPTION_ROW_STYLES[opt.letter] ?? 'border-border bg-muted/20'}`}
                                      >
                                        <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${OPTION_LETTER_STYLES[opt.letter] ?? 'bg-muted text-foreground'}`}>
                                          {opt.letter}
                                        </span>
                                        <span className="text-foreground/90 leading-relaxed">{opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                        {q.extracted_topic && (
                          <div className="mt-3 inline-block text-[10px] uppercase tracking-wider font-semibold text-purple-500 bg-purple-500/10 px-2 py-1 rounded">
                            {q.extracted_topic}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {theoryQuestions.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">Theory & Essay Questions</h3>
                    {theoryQuestions.map((q) => (
                      <div key={q.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-foreground">Question {q.question_number}</span>
                          <span className="text-sm font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
                            {q.marks_available} marks
                          </span>
                        </div>
                        <div className="text-sm text-foreground/80 prose prose-sm dark:prose-invert max-w-none [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {q.text_content}
                          </ReactMarkdown>
                        </div>
                        {q.extracted_topic && (
                          <div className="mt-3 inline-block text-[10px] uppercase tracking-wider font-semibold text-purple-500 bg-purple-500/10 px-2 py-1 rounded">
                            {q.extracted_topic}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Limit</span>
                <span className="font-medium">120 Minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Marks</span>
                <span className="font-medium">
                  {questions.reduce((sum, q) => sum + (q.marks_available || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded</span>
                <span className="font-medium">{new Date(paper.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
