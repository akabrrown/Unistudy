'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Clock,
  FileText,
  Bot,
  FileQuestion,
  ArrowRight,
  Trash2,
  Loader2,
  DownloadCloud,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  RefreshCw,
  BookOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const OPTION_LETTER_STYLES: Record<string, string> = {
  A: 'bg-muted/60 text-muted-foreground border border-border/60',
  B: 'bg-muted/60 text-muted-foreground border border-border/60',
  C: 'bg-muted/60 text-muted-foreground border border-border/60',
  D: 'bg-muted/60 text-muted-foreground border border-border/60',
  E: 'bg-muted/60 text-muted-foreground border border-border/60',
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
  const [isExtracting, setIsExtracting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'trial' | 'pdf'>('trial')
  const [trialAnswers, setTrialAnswers] = useState<Record<string, string>>({})
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  const extractQuestions = async (silent = false, force = false) => {
    setIsExtracting(true);
    try {
      const url = `/api/v1/past-questions/${params.id}/extract${force ? '?force=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const sorted = [...data.questions].sort((a: any, b: any) => 
            String(a.question_number || a.id).localeCompare(String(b.question_number || b.id), undefined, { numeric: true })
          );
          setQuestions(sorted);
          if (!silent) {
            toast.success(`Extracted ${sorted.length} examination questions verbatim from PDF!`);
          }
          setActiveTab('trial');
          return sorted;
        }
      }
    } catch (e: any) {
      console.warn('Extraction notice:', e.message);
    } finally {
      setIsExtracting(false);
    }
    return null;
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      let foundQuestions: any[] = [];
      
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
            if (Array.isArray(qData) && qData.length > 0) {
              let sortedQs = [...qData].sort((a: any, b: any) => 
                String(a.question_number || a.id).localeCompare(String(b.question_number || b.id), undefined, { numeric: true })
              );
              sortedQs = sortedQs.map((q: any) => {
                const hasPrefix = q.extracted_topic && q.extracted_topic.includes('|');
                const isMcq = hasPrefix 
                  ? q.extracted_topic.startsWith('MCQ|')
                  : /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content || q.question || '');
                return isMcq ? { ...q, marks_available: q.marks_available || 1, isMcq: true } : { ...q, isMcq: false };
              });
              foundQuestions = sortedQs;
              setQuestions(sortedQs);
              setLoading(false);
              return;
            }
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
            
          if (qData && qData.length > 0) {
            let sortedQs = [...qData].sort((a, b) => 
              String(a.question_number).localeCompare(String(b.question_number), undefined, { numeric: true })
            );
            
            sortedQs = sortedQs.map(q => {
              const hasPrefix = q.extracted_topic && q.extracted_topic.includes('|');
              const isMcq = hasPrefix 
                ? q.extracted_topic.startsWith('MCQ|')
                : /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content);
                
              return isMcq ? { ...q, marks_available: q.marks_available || 1, isMcq: true } : { ...q, isMcq: false };
            });
            
            foundQuestions = sortedQs;
            setQuestions(sortedQs);
          }
        }
      } else {
        // Fallback for KLOK string IDs
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

      // Auto-extract immediately if paper has 0 questions so it's ready for trial
      if (foundQuestions.length === 0) {
        void extractQuestions(true);
      }
    };
    
    if (params.id) {
      void fetchDetails();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto py-4">
        <div className="h-8 w-1/4 bg-muted/50 rounded"></div>
        <div className="h-32 bg-muted/50 rounded-xl"></div>
        <div className="h-96 bg-muted/50 rounded-xl"></div>
      </div>
    );
  }

  if (!paper) {
    return <div className="text-center py-12 text-muted-foreground">Past examination paper not found.</div>;
  }

  const startAttempt = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please log in to start a trial attempt');
      return;
    }

    const { data, error } = await supabase
      .from('past_paper_attempts')
      .insert({
        past_paper_id: paper.id,
        user_id: session.user.id,
        time_limit_minutes: 120,
      })
      .select()
      .single();

    if (!error && data) {
      router.push(`/dashboard/past-papers/${paper.id}/attempt?attemptId=${data.id}`);
    } else {
      const { data: existingData } = await supabase
        .from('past_paper_attempts')
        .select('id')
        .eq('past_paper_id', paper.id)
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (existingData) {
        router.push(`/dashboard/past-papers/${paper.id}/attempt?attemptId=${existingData.id}`);
      } else {
        router.push(`/dashboard/past-papers/${paper.id}/attempt?attemptId=trial-${Date.now()}`);
      }
    }
  };

  const handleDeletePaper = async () => {
    if (!paper) return;
    if (!confirm('Are you sure you want to delete this past question paper? All extracted questions and attempts will be permanently deleted.')) return;

    setIsDeleting(true);
    try {
      await apiFetch(`/past-papers/${paper.id}`, { method: 'DELETE' });
      toast.success('Past paper deleted successfully');
      router.push('/dashboard/past-papers');
    } catch (err: any) {
      try {
        const { error } = await supabase.from('past_papers').delete().eq('id', paper.id);
        if (error) throw error;
        toast.success('Past paper deleted successfully');
        router.push('/dashboard/past-papers');
      } catch (fallbackErr: any) {
        toast.error(fallbackErr?.message || err?.message || 'Failed to delete past paper');
        setIsDeleting(false);
      }
    }
  };

  const handleSelectOption = (questionId: string, letter: string) => {
    setTrialAnswers(prev => ({
      ...prev,
      [questionId]: prev[questionId] === letter ? '' : letter,
    }));
  };

  const toggleSolution = (questionId: string) => {
    setRevealedSolutions(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const mcqQuestions = questions.filter(q => q.isMcq);
  const theoryQuestions = questions.filter(q => !q.isMcq);
  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.marks_available || (q.isMcq ? 1 : 20)), 0);
  const effectiveDownloadUrl =
    paper.download_url ||
    `/api/v1/past-questions/download?id=${encodeURIComponent(paper.id || (params.id as string))}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Top Breadcrumb */}
      <Link href="/dashboard/past-papers">
        <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Past Question Bank
        </Button>
      </Link>

      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#00004E] dark:text-white">
              {paper.courses?.course_code || paper.course_code || paper.title || 'Course Paper'}
            </h1>
            <span className="px-3 py-1 bg-[#00004E]/10 text-[#00004E] dark:bg-[#D89A06]/20 dark:text-[#D89A06] border border-[#00004E]/15 dark:border-[#D89A06]/30 rounded-full text-xs font-bold font-mono">
              {paper.year}
            </span>
            <span className="px-3 py-1 bg-secondary/20 text-secondary-foreground border border-border/60 rounded-full text-xs font-semibold capitalize">
              {paper.exam_type === 'end-semester' ? 'End-Semester Exam' : (paper.exam_type || 'Examination')}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> Ready for Trial
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{paper.courses?.title || paper.title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => extractQuestions(false, true)}
            variant="outline"
            size="sm"
            disabled={isExtracting}
            className="h-9 gap-1.5 cursor-pointer font-medium border-border hover:border-primary/50"
            title="Re-extract authentic questions verbatim from PDF with AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06] ${isExtracting ? 'animate-spin' : ''}`} />
            {isExtracting ? 'Extracting...' : 'Re-extract AI'}
          </Button>

          <a href={effectiveDownloadUrl} target="_blank" rel="noopener noreferrer" download>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer font-medium border-border hover:border-primary/50">
              <DownloadCloud className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
              Download PDF
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
              Delete
            </Button>
          )}

          <Button
            onClick={startAttempt}
            size="sm"
            className="h-9 gap-1.5 bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white shadow-xs cursor-pointer font-semibold"
          >
            Start Timed Trial Mock (120 Mins) <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Dual View Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1">
        <button
          onClick={() => setActiveTab('trial')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'trial'
              ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Extracted Trial Questions ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'pdf'
              ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Original Examination Document (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {activeTab === 'trial' ? (
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileQuestion className="w-5 h-5 text-[#00004E] dark:text-[#D89A06]" />
                    <span>Official Examination Trial Paper</span>
                  </CardTitle>
                  <span className="text-xs font-medium text-muted-foreground">
                    Click choices to practice trial answers or start a 120-min timed trial attempt
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {isExtracting ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-muted/15 rounded-xl border border-dashed border-border space-y-3">
                    <Bot className="w-8 h-8 animate-bounce text-[#00004E] dark:text-[#D89A06]" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">AI is extracting questions from the exam paper...</p>
                      <p className="text-xs text-muted-foreground">Parsing Section A (MCQs) and Section B (Theory) for your trial practice.</p>
                    </div>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-muted/15 rounded-xl border border-dashed border-border space-y-4">
                    <FileText className="w-8 h-8 text-[#00004E] dark:text-[#D89A06]" />
                    <div className="space-y-1 max-w-md">
                      <h3 className="text-base font-semibold text-foreground">Extract Examination Questions</h3>
                      <p className="text-xs text-muted-foreground">
                        Extract individual MCQs and theory problems from this PDF paper to unlock interactive trial practice and timed mocks.
                      </p>
                    </div>
                    <Button
                      onClick={() => extractQuestions(false, true)}
                      size="sm"
                      className="gap-2 bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] text-white cursor-pointer font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Extract Authentic Questions for Trial
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Trial Mode Banner */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-semibold text-foreground">
                          {mcqQuestions.length} MCQs &amp; {theoryQuestions.length} Structured Problems extracted from authentic exam
                        </span>
                      </div>
                      <Button
                        onClick={startAttempt}
                        size="sm"
                        className="h-7 text-xs px-3 bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] text-white font-semibold cursor-pointer"
                      >
                        Launch Timed Mock <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>

                    {/* Section A: MCQs */}
                    {mcqQuestions.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-[#00004E] dark:text-[#D89A06]">
                            Section A: Multiple Choice Questions ({mcqQuestions.length})
                          </h3>
                          <span className="text-xs text-muted-foreground font-mono">1 Mark Each</span>
                        </div>
                        {mcqQuestions.map((q) => {
                          const { stem, options } = parseMcqContent(q.text_content.replace(/<br\s*\/?>/gi, '\n'));
                          const selected = trialAnswers[q.id];
                          const isRevealed = revealedSolutions[q.id];

                          return (
                            <div key={q.id} className="p-4.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-sm text-foreground font-mono">
                                  Question {q.question_number}
                                </span>
                                <div className="flex items-center gap-2">
                                  {q.extracted_topic && (
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D89A06] bg-[#D89A06]/10 px-2 py-0.5 rounded">
                                      {cleanTopic(q.extracted_topic)}
                                    </span>
                                  )}
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    {q.marks_available || 1} mark
                                  </span>
                                </div>
                              </div>

                              {stem && (
                                <div className="text-sm text-foreground/90 prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{stem}</ReactMarkdown>
                                </div>
                              )}

                              {options.length > 0 && (
                                <div className="space-y-2 pt-1">
                                  {options.map((opt) => {
                                    const isCurrentSelected = selected === opt.letter;
                                    return (
                                      <button
                                        key={opt.letter}
                                        type="button"
                                        onClick={() => handleSelectOption(q.id, opt.letter)}
                                        className={`w-full flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm text-left transition-all cursor-pointer ${
                                          isCurrentSelected
                                            ? 'border-[#00004E] bg-[#00004E]/5 dark:border-[#D89A06] dark:bg-[#D89A06]/10 font-medium'
                                            : 'border-border/70 bg-card hover:bg-muted/40'
                                        }`}
                                      >
                                        <span
                                          className={`shrink-0 flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${
                                            isCurrentSelected
                                              ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E]'
                                              : (OPTION_LETTER_STYLES[opt.letter] ?? 'bg-muted text-foreground')
                                          }`}
                                        >
                                          {opt.letter}
                                        </span>
                                        <span className="text-foreground/90 leading-relaxed text-xs sm:text-sm">
                                          {opt.text}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                <span className="text-muted-foreground">
                                  {selected ? `Selected Choice: ${selected}` : 'Click an option to trial answer'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleSolution(q.id)}
                                  className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer font-medium"
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  {isRevealed ? 'Hide Hint / Solution' : 'Check Hint / Solution'}
                                </button>
                              </div>

                              {isRevealed && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/90 space-y-1">
                                  <p className="font-semibold text-primary">Trial Solution Guide:</p>
                                  <p className="text-muted-foreground">
                                    Analyze the core concept of {cleanTopic(q.extracted_topic) || 'this topic'}. To submit your final response for full AI marking and rubric feedback, click &ldquo;Start Timed Trial Mock&rdquo;.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Section B: Theory & Essay */}
                    {theoryQuestions.length > 0 && (
                      <div className="space-y-4 mt-8">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-[#00004E] dark:text-[#D89A06]">
                            Section B: Theory &amp; Problem Solving ({theoryQuestions.length})
                          </h3>
                          <span className="text-xs text-muted-foreground font-mono">Structured / Essay</span>
                        </div>
                        {theoryQuestions.map((q) => {
                          const isRevealed = revealedSolutions[q.id];

                          return (
                            <div key={q.id} className="p-4.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-sm text-foreground font-mono">
                                  Question {q.question_number}
                                </span>
                                <div className="flex items-center gap-2">
                                  {q.extracted_topic && (
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D89A06] bg-[#D89A06]/10 px-2 py-0.5 rounded">
                                      {cleanTopic(q.extracted_topic)}
                                    </span>
                                  )}
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    {q.marks_available || 20} marks
                                  </span>
                                </div>
                              </div>

                              <div className="text-sm text-foreground/90 prose prose-sm dark:prose-invert max-w-none [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {q.text_content.replace(/<br\s*\/?>/gi, '\n')}
                                </ReactMarkdown>
                              </div>

                              {/* Trial Scratchpad toggle */}
                              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                                <button
                                  type="button"
                                  onClick={() => toggleSolution(q.id)}
                                  className="inline-flex items-center gap-1.5 text-primary hover:underline cursor-pointer font-medium"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  {isRevealed ? 'Close Trial Draft Scratchpad' : 'Open Trial Draft Scratchpad'}
                                </button>
                                <span className="text-muted-foreground text-[11px]">
                                  Full rubric grading active in Timed Mock
                                </span>
                              </div>

                              {isRevealed && (
                                <div className="p-3.5 rounded-lg bg-muted/20 border border-border space-y-2">
                                  <label className="text-xs font-semibold text-foreground">
                                    Trial Answer Draft &amp; Outline:
                                  </label>
                                  <textarea
                                    rows={3}
                                    placeholder="Type your outline, formulas, or key bullet points here to practice..."
                                    className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <p className="text-[11px] text-muted-foreground">
                                    Trial draft saved locally. Launch the Timed Mock Exam when ready for official AI essay grading.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bottom CTA to start attempt */}
                    <div className="p-5 rounded-xl bg-gradient-to-r from-[#00004E]/10 via-[#00004E]/5 to-transparent dark:from-[#D89A06]/15 dark:to-transparent border border-[#00004E]/20 dark:border-[#D89A06]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">Ready for the Full Examination?</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Start a 120-minute timed mock attempt with automatic question tracking and instant AI marking.
                        </p>
                      </div>
                      <Button
                        onClick={startAttempt}
                        className="bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white font-semibold cursor-pointer shrink-0"
                      >
                        Start Timed Trial Mock <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Tab 2: Original Examination PDF Document */
            <Card className="border-border/80 shadow-xs space-y-4">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#00004E] dark:text-[#D89A06]" />
                    <span>Original Examination Document</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <a href={effectiveDownloadUrl} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
                        <DownloadCloud className="w-3.5 h-3.5 text-primary" /> Download PDF
                      </Button>
                    </a>
                    <a href={effectiveDownloadUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
                        <ExternalLink className="w-3.5 h-3.5 text-primary" /> Fullscreen
                      </Button>
                    </a>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="w-full h-[700px] rounded-xl overflow-hidden border border-border/80 bg-muted/10 shadow-xs relative">
                  <iframe
                    src={`${effectiveDownloadUrl}#toolbar=1`}
                    className="w-full h-full border-0"
                    title={paper.title || 'Official Examination Paper PDF'}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  Viewing authentic original document. Switch to &ldquo;Extracted Trial Questions&rdquo; tab to practice interactive trial questions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Rail: Exam Details */}
        <div className="space-y-6">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" /> Trial Exam Overview
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
                <span className="text-muted-foreground">Total Questions</span>
                <span className="font-bold text-foreground">
                  {questions.length > 0 ? `${questions.length} Questions` : 'Ready to Extract'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">MCQs (Sec A)</span>
                <span className="font-medium">{mcqQuestions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Theory (Sec B)</span>
                <span className="font-medium">{theoryQuestions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Available Marks</span>
                <span className="font-medium">
                  {totalCalculatedMarks > 0 ? `${totalCalculatedMarks} Marks` : '100 Marks'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trial Format</span>
                <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-[#00004E]/10 text-[#00004E] dark:bg-[#D89A06]/20 dark:text-[#D89A06]">
                  Interactive + PDF
                </span>
              </div>

              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <Button
                  onClick={startAttempt}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Launch Timed Trial Mock
                </Button>

                <a
                  href={effectiveDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background hover:bg-muted px-3.5 py-2.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
                  Download PDF (Offline)
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
