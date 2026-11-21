'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, FileText, Bot, FileQuestion, ArrowRight, Trash2, Loader2, DownloadCloud, ExternalLink, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const OPTION_LETTER_STYLES: Record<string, string> = {
  A: 'bg-muted/50 text-muted-foreground border border-border/50',
  B: 'bg-muted/50 text-muted-foreground border border-border/50',
  C: 'bg-muted/50 text-muted-foreground border border-border/50',
  D: 'bg-muted/50 text-muted-foreground border border-border/50',
  E: 'bg-muted/50 text-muted-foreground border border-border/50',
}

const OPTION_ROW_STYLES: Record<string, string> = {
  A: 'border-border bg-card hover:bg-muted/30 transition-colors',
  B: 'border-border bg-card hover:bg-muted/30 transition-colors',
  C: 'border-border bg-card hover:bg-muted/30 transition-colors',
  D: 'border-border bg-card hover:bg-muted/30 transition-colors',
  E: 'border-border bg-card hover:bg-muted/30 transition-colors',
}

const cleanTopic = (topic: string) => {
  if (!topic) return ''
  let cleaned = topic.replace(/^(MCQ|THEORY)\|/i, '')
  cleaned = cleaned.split(/<br\s*\/?>|\n/i)[0]
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 47) + '...'
  }
  return cleaned.trim()
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
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      
      try {
        const res = await fetch(`/api/v1/past-questions/${params.id}`, { cache: 'no-store' });
        if (res.ok) {
          const pData = await res.json();
          if (pData && pData.id) {
            setPaper({
              ...pData,
              download_url: pData.download_url || `/api/v1/past-questions/download?id=${encodeURIComponent(pData.id)}`,
            });
            const qData = pData.past_paper_questions || pData.questions || [];
            let sortedQs = [...qData].sort((a: any, b: any) => 
              String(a.question_number || a.id).localeCompare(String(b.question_number || b.id), undefined, { numeric: true })
            );
            sortedQs = sortedQs.map((q: any) => {
              const hasPrefix = q.extracted_topic && q.extracted_topic.includes('|');
              const isMcq = hasPrefix 
                ? q.extracted_topic.startsWith('MCQ|')
                : /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content || q.question || '');
              return isMcq ? { ...q, marks_available: 1, isMcq: true } : { ...q, isMcq: false };
            });
            setQuestions(sortedQs);
            setLoading(false);
            return;
          }
        }
      } catch (proxyErr) {
        console.warn('[PastPaperDetails] Next API fetch notice, falling back:', proxyErr);
      }

      const isUuid = typeof params.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

      if (isUuid) {
        const { data: pData } = await supabase
          .from('past_papers')
          .select('*, courses(course_code, title)')
          .eq('id', params.id)
          .maybeSingle();
          
        if (pData) {
          let directPdfUrl: string | null = null;
          try {
            const { data: pageRows } = await supabase
              .from('past_paper_pages')
              .select('image_url')
              .eq('past_paper_id', pData.id)
              .limit(1);
            if (pageRows && pageRows.length > 0 && pageRows[0].image_url) {
              directPdfUrl = pageRows[0].image_url;
            }
          } catch (_) {}

          setPaper({
            ...pData,
            download_url: directPdfUrl || `/api/v1/past-questions/download?id=${encodeURIComponent(pData.id)}`,
          });
          
          const { data: qData } = await supabase
            .from('past_paper_questions')
            .select('*')
            .eq('past_paper_id', pData.id)
            .order('question_number', { ascending: true });
            
          if (qData) {
            let sortedQs = [...qData].sort((a, b) => 
              a.question_number.localeCompare(b.question_number, undefined, { numeric: true })
            );
            
            sortedQs = sortedQs.map(q => {
              const hasPrefix = q.extracted_topic && q.extracted_topic.includes('|');
              const isMcq = hasPrefix 
                ? q.extracted_topic.startsWith('MCQ|')
                : /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content);
                
              return isMcq ? { ...q, marks_available: 1, isMcq: true } : { ...q, isMcq: false };
            });
            
            setQuestions(sortedQs);
          }
        }
      } else {
        // Fallback for KLOK string IDs if API route had any issue
        setPaper({
          id: params.id,
          title: String(params.id),
          course_code: String(params.id).split(/[-_]/)[0] || 'EXAM',
          year: new Date().getFullYear(),
          exam_type: 'end-semester',
          created_at: new Date().toISOString(),
          download_url: `/api/v1/past-questions/download?id=${encodeURIComponent(String(params.id))}`,
          courses: {
            course_code: String(params.id).split(/[-_]/)[0] || 'EXAM',
          },
        });
      }
      
      setLoading(false);
    };
    
    if (params.id) {
      void fetchDetails();
    }
  }, [params.id]);

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
        time_limit_minutes: 120
      })
      .select()
      .single()

    if (!error && data) {
      router.push(`/dashboard/past-papers/${paper.id}/attempt?attemptId=${data.id}`)
    } else {
      const { data: existingData } = await supabase
        .from('past_paper_attempts')
        .select('id')
        .eq('past_paper_id', paper.id)
        .eq('user_id', session.user.id)
        .single()
        
      if (existingData) {
        router.push(`/dashboard/past-papers/${paper.id}/attempt?attemptId=${existingData.id}`)
      }
    }
  }

  const handleDeletePaper = async () => {
    if (!paper) return
    if (!confirm('Are you sure you want to delete this past question paper? All extracted questions and attempts will be permanently deleted.')) return

    setIsDeleting(true)
    try {
      await apiFetch(`/past-papers/${paper.id}`, { method: 'DELETE' })
      toast.success('Past paper deleted successfully')
      router.push('/dashboard/past-papers')
    } catch (err: any) {
      console.warn('Backend delete error, trying direct Supabase fallback:', err?.message)
      try {
        const { error } = await supabase.from('past_papers').delete().eq('id', paper.id)
        if (error) throw error
        toast.success('Past paper deleted successfully')
        router.push('/dashboard/past-papers')
      } catch (fallbackErr: any) {
        toast.error(fallbackErr?.message || err?.message || 'Failed to delete past paper')
        setIsDeleting(false)
      }
    }
  }

  const mcqQuestions = questions.filter(q => q.isMcq)
  const theoryQuestions = questions.filter(q => !q.isMcq)
  const effectiveDownloadUrl =
    paper.download_url ||
    `/api/v1/past-questions/download?id=${encodeURIComponent(paper.id || (params.id as string))}`

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/dashboard/past-papers">
        <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Bank
        </Button>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#00004E] dark:text-white">
              {paper.courses?.course_code || paper.course_code || paper.title || 'Course Paper'} 
            </h1>
            <span className="px-3 py-1 bg-[#00004E]/10 text-[#00004E] dark:bg-[#D89A06]/20 dark:text-[#D89A06] border border-[#00004E]/15 dark:border-[#D89A06]/30 rounded-full text-xs font-bold font-mono">
              {paper.year}
            </span>
            <span className="px-3 py-1 bg-secondary/20 text-secondary-foreground border border-border/60 rounded-full text-xs font-semibold capitalize">
              {paper.exam_type === 'end-semester' ? 'End-Semester Exam' : (paper.exam_type || 'Examination')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{paper.courses?.title || paper.title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={effectiveDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            <Button variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer font-medium border-border hover:border-primary/50">
              <DownloadCloud className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
              Download PDF
            </Button>
          </a>
          <a
            href={effectiveDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer font-medium border-border hover:border-primary/50">
              <ExternalLink className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
              View PDF
            </Button>
          </a>
          {paper.source !== 'klok' && (
            <Button
              onClick={handleDeletePaper}
              variant="outline"
              size="sm"
              disabled={isDeleting}
              className="h-9 text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Delete Paper
            </Button>
          )}
          <Button onClick={startAttempt} size="sm" className="h-9 gap-1.5 bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white shadow-xs cursor-pointer font-semibold">
            {questions.length > 0 ? 'Start Attempt' : 'Practice Exam Mode'} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-[#00004E] dark:text-[#D89A06]" />
                <span>Examination Paper Content</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono">
                {questions.length > 0 ? `${questions.length} Questions Extracted` : 'Official Document Mode'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {paper.status === 'processing' ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                <Bot className="w-8 h-8 mb-3 animate-pulse text-[#00004E] dark:text-[#D89A06]" />
                <p>AI is currently extracting questions from the PDF...</p>
                <p className="text-sm mt-1 opacity-70">This usually takes about 30-60 seconds.</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center justify-center py-7 px-5 text-center bg-muted/15 rounded-xl border border-dashed border-border space-y-3.5">
                  <div className="h-12 w-12 rounded-xl bg-[#00004E]/10 dark:bg-[#D89A06]/15 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#00004E] dark:text-[#D89A06]" />
                  </div>
                  <div className="space-y-1.5 max-w-lg">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#00004E]/10 text-[#00004E] dark:bg-[#D89A06]/20 dark:text-[#D89A06]">
                      <ShieldCheck className="w-3.5 h-3.5" /> Official University Examination Paper
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {paper.courses?.course_code || paper.course_code || 'Course'} — {paper.year} Examination
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This authentic past examination paper is available directly in your course bank. View the interactive document preview below or download the original PDF for offline study.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <a
                      href={effectiveDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white px-4 py-2 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Fullscreen Document
                    </a>
                    <a
                      href={effectiveDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background hover:bg-muted px-4 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
                      Download PDF Document
                    </a>
                  </div>
                </div>

                {/* Embedded PDF Document Preview */}
                <div className="w-full h-[650px] rounded-xl overflow-hidden border border-border/80 bg-muted/10 shadow-xs relative">
                  <iframe
                    src={`${effectiveDownloadUrl}#toolbar=1`}
                    className="w-full h-full border-0"
                    title={paper.title || 'Past Examination Paper PDF'}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Notice: If the PDF preview doesn&apos;t display automatically in your browser, click <a href={effectiveDownloadUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">Open Fullscreen Document</a> or download directly.
                </p>
              </div>
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
                            const { stem, options } = parseMcqContent(q.text_content.replace(/<br\s*\/?>/gi, '\n'))
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
                          <div className="mt-3 inline-block text-[10px] uppercase tracking-wider font-semibold text-[#D89A06] bg-[#D89A06]/10 px-2 py-1 rounded">
                            {cleanTopic(q.extracted_topic)}
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
                            {q.text_content.replace(/<br\s*\/?>/gi, '\n')}
                          </ReactMarkdown>
                        </div>
                        {q.extracted_topic && (
                          <div className="mt-3 inline-block text-[10px] uppercase tracking-wider font-semibold text-[#D89A06] bg-[#D89A06]/10 px-2 py-1 rounded">
                            {cleanTopic(q.extracted_topic)}
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
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" /> Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Course Code</span>
                <span className="font-bold text-[#00004E] dark:text-[#D89A06] font-mono">
                  {paper.courses?.course_code || paper.course_code || 'EXAM'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Academic Year</span>
                <span className="font-semibold">{paper.year}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Time Limit</span>
                <span className="font-medium">120 Minutes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Marks</span>
                <span className="font-medium">
                  {questions.length > 0 
                    ? `${questions.reduce((sum, q) => sum + (q.marks_available || 0), 0)} Marks`
                    : '100 Marks Available'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium text-xs px-2 py-0.5 rounded bg-muted">Official PDF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Added On</span>
                <span className="font-medium">{new Date(paper.created_at).toLocaleDateString()}</span>
              </div>
              <div className="pt-4 border-t border-border/60 space-y-2">
                <a
                  href={effectiveDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  Download PDF (Offline)
                </a>
                <a
                  href={effectiveDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background hover:bg-muted px-3.5 py-2.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
                  Open PDF in New Window
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
