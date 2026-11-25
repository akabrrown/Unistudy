'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import confetti from 'canvas-confetti'
import { generateFlashcards, submitFlashcardReview } from '@/app/actions/flashcards'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RadialRing } from '@/components/ui/sparkline'
import { ChevronLeft, Loader2, BrainCircuit, RotateCcw, Volume2, RefreshCw, Layers, PlayCircle, Lightbulb, Languages } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { createClient } from '@/lib/supabase/client'
import { Rating } from '@/lib/utils/sm2'
import { useSettings } from '@/contexts/SettingsContext'
import { toast } from 'sonner'
import { FlashcardStackIllustration } from '@/components/illustrations'
import {
  getCachedFlashcardsFast,
  setCachedFlashcardsFast,
  getCachedCourseLecturesFast,
  setCachedCourseLecturesFast,
} from '@/lib/offlineSync'
import { db } from '@/lib/db'

export default function FlashcardsPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const { settings } = useSettings()
  
  const [lectures, setLectures] = useState<any[]>([])
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  // Review mode state
  const [reviewMode, setReviewMode] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionCounts, setSessionCounts] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  })
  const [dueCards, setDueCards] = useState<any[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [submittingRating, setSubmittingRating] = useState(false)
  
  // AI assistance state
  const [mnemonicsLoading, setMnemonicsLoading] = useState(false)
  const [mnemonicsData, setMnemonicsData] = useState<{ acronym?: string; sentence?: string; rhyme?: string } | null>(null)
  const [translating, setTranslating] = useState(false)
  const [translatedFront, setTranslatedFront] = useState('')
  const [translatedBack, setTranslatedBack] = useState('')

  // Anki / FSRS Keyboard Navigation
  useEffect(() => {
    if (!reviewMode || dueCards.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped && !submittingRating) {
        if (e.key === '1') {
          e.preventDefault();
          void handleRating('again');
        } else if (e.key === '2') {
          e.preventDefault();
          void handleRating('hard');
        } else if (e.key === '3') {
          e.preventDefault();
          void handleRating('good');
        } else if (e.key === '4') {
          e.preventDefault();
          void handleRating('easy');
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewMode, dueCards.length, isFlipped, submittingRating, currentCardIndex]);

  useEffect(() => {
    fetchData()
  }, [courseId])

  async function fetchData() {
    // 0ms Local-First Cache Preload: Instant UI render from IndexedDB
    try {
      const [cachedLecs, cachedCards] = await Promise.all([
        getCachedCourseLecturesFast(courseId),
        getCachedFlashcardsFast(courseId),
      ]);
      if (cachedCards && cachedCards.length > 0) {
        if (cachedLecs && cachedLecs.length > 0) setLectures(cachedLecs);
        setFlashcards(cachedCards);
        setLoading(false);
      }
    } catch {}

    let lecs: any[] = []
    try {
      lecs = await apiFetch(`/lectures/${courseId}`)
    } catch (err) {
      console.warn('apiFetch lectures failed, querying Supabase directly:', err)
    }

    if (!Array.isArray(lecs) || lecs.length === 0) {
      try {
        const supabase = createClient()
        const { data: dbLectures } = await supabase
          .from('lectures')
          .select('*')
          .eq('course_id', courseId)
          .order('week', { ascending: true })

        if (Array.isArray(dbLectures) && dbLectures.length > 0) {
          lecs = dbLectures
        }
      } catch (sbErr) {
        console.error('Supabase lectures fallback failed:', sbErr)
      }
    }

    const cleanLectures = (lecs || []).filter((l: any) => !l.title?.startsWith('[FAILED'))
    setLectures(cleanLectures)
    void setCachedCourseLecturesFast(courseId, cleanLectures);
    const lecIds = cleanLectures.map((l: any) => l.id)

    const { getFlashcards } = await import('@/app/actions/flashcards')
    const res = lecIds.length > 0 ? await getFlashcards(lecIds) : { data: [] }
    const fetchedCards = res.data || []
    setFlashcards(fetchedCards)
    void setCachedFlashcardsFast(courseId, fetchedCards);
    setLoading(false)
    return fetchedCards
  }

  async function handleGenerate(lectureId: string) {
    setGeneratingFor(lectureId)
    const res = await generateFlashcards(lectureId)
    if (res.error) {
      toast.error(typeof res.error === 'string' ? res.error : 'Failed to generate flashcards')
    } else {
      if (typeof (res as any).remainingCredits === 'number' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('unistudy-credits-changed', { detail: { balance: (res as any).remainingCredits } }))
      }
      const updatedCards = await fetchData()
      const returnedCards = Array.isArray((res as any).cards) ? (res as any).cards : []
      let effectiveCards = updatedCards

      if (effectiveCards.filter((c: any) => c.lecture_id === lectureId).length === 0 && returnedCards.length > 0) {
        effectiveCards = [...updatedCards.filter((c: any) => c.lecture_id !== lectureId), ...returnedCards]
        setFlashcards(effectiveCards)
      }

      toast.success(`Generated ${res.count || returnedCards.length || 0} flashcards! Opening deck...`)
      startReview(lectureId, effectiveCards)
    }
    setGeneratingFor(null)
  }

  function startReview(lectureId?: string, cardSource?: any[]) {
    const cardsToUse = cardSource || flashcards
    const nowWithBuffer = new Date(Date.now() + 60000)
    let pool = cardsToUse.filter(c => new Date(c.next_review) <= nowWithBuffer)

    if (lectureId) {
      const lecturePool = cardsToUse.filter(c => c.lecture_id === lectureId)
      pool = pool.filter(c => c.lecture_id === lectureId)
      if (pool.length === 0 && lecturePool.length > 0) {
        pool = lecturePool
      }
    } else if (pool.length === 0 && cardsToUse.length > 0) {
      pool = cardsToUse
    }

    if (pool.length === 0) {
      toast.error("No flashcards are currently available for review!")
      return
    }

    setDueCards(pool)
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setMnemonicsData(null)
    setTranslatedFront('')
    setTranslatedBack('')
    setSessionCounts({ again: 0, hard: 0, good: 0, easy: 0 })
    setSessionComplete(false)
    setReviewMode(true)
  }

  async function handleRating(rating: Rating) {
    const card = dueCards[currentCardIndex]
    if (!card) return;

    const reviewPayload = {
      ease_factor: card.ease_factor,
      interval_days: card.interval_days,
      repetitions: card.repetitions,
    };

    const nextCounts = {
      ...sessionCounts,
      [rating]: (sessionCounts[rating] || 0) + 1,
    };
    setSessionCounts(nextCounts);

    // 0ms Optimistic Navigation: Advance card immediately without waiting for server response
    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      setMnemonicsData(null);
      setTranslatedFront('');
      setTranslatedBack('');
    } else {
      setSessionComplete(true);
      const strongCount = nextCounts.good + nextCounts.easy;
      const pct = Math.round((strongCount / Math.max(1, dueCards.length)) * 100);
      if (pct >= 70 && !settings.reduced_motion && typeof window !== 'undefined') {
        try {
          void confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
        } catch {}
      }
      toast.success("Deck review completed!");
    }

    // Background Async Sync: persist review to database or offline queue
    void (async () => {
      try {
        const res = await submitFlashcardReview(card.id, rating, reviewPayload);
        if (res.nextData) {
          setFlashcards(prev => {
            const updated = prev.map(c => c.id === card.id ? { ...c, ...res.nextData } : c);
            void setCachedFlashcardsFast(courseId, updated);
            return updated;
          });
        }
      } catch (err) {
        console.warn('[Flashcards] Background review sync queued for reconnect:', err);
        try {
          await db.sync_queue.add({
            action: 'review_card',
            payload: { cardId: card.id, rating, currentData: reviewPayload },
            createdAt: Date.now(),
            retries: 0,
          });
        } catch {}
      }
    })();
  }

  function playAudio(text: string, e: React.MouseEvent) {
    e.stopPropagation() // Prevent card flip
    if ('speechSynthesis' in window) {
      // Strip HTML tags for clean reading
      const cleanText = text.replace(/<[^>]+>/g, '')
      const utterance = new SpeechSynthesisUtterance(cleanText)
      window.speechSynthesis.cancel() // Stop currently playing
      window.speechSynthesis.speak(utterance)
    } else {
      toast.error('Text-to-speech is not supported in this browser.')
    }
  }

  async function handleGenerateMnemonics(e: React.MouseEvent) {
    e.stopPropagation();
    if (mnemonicsData) return;
    
    setMnemonicsLoading(true);
    const card = dueCards[currentCardIndex];
    try {
      const promptText = `Front: ${card.front}\nBack: ${card.back}`;
      const res = await apiFetch('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          feature: 'generate_mnemonics',
          payload: { prompt: promptText, stream: false }
        })
      });
      if (res.result) {
        setMnemonicsData(res.result);
      } else {
        toast.error("Could not generate mnemonics right now.");
      }
    } catch {
      toast.error("Could not generate mnemonics right now.");
    } finally {
      setMnemonicsLoading(false);
    }
  }

  async function handleTranslate(e: React.MouseEvent) {
    e.stopPropagation();
    if (translatedFront && translatedBack) return;
    
    setTranslating(true);
    const targetLanguage = settings.language || 'fr';
    const card = dueCards[currentCardIndex];
    try {
      const [frontRes, backRes] = await Promise.all([
        apiFetch('/translate', { method: 'POST', body: JSON.stringify({ text: card.front, targetLanguage }) }),
        apiFetch('/translate', { method: 'POST', body: JSON.stringify({ text: card.back, targetLanguage }) })
      ]);
      
      if (frontRes.translatedText) setTranslatedFront(frontRes.translatedText);
      if (backRes.translatedText) setTranslatedBack(backRes.translatedText);
    } catch {
      toast.error("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (reviewMode && sessionComplete) {
    const totalReviewed = dueCards.length;
    const strongRecall = sessionCounts.good + sessionCounts.easy;
    const retentionPct = Math.round((strongRecall / Math.max(1, totalReviewed)) * 100);
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto min-h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-center">
        <div className="w-full rounded-3xl border border-border/80 bg-card p-8 text-center space-y-6 shadow-xs">
          <div className="flex justify-center">
            <RadialRing
              percent={retentionPct}
              size={112}
              strokeWidth={8}
              label={`${retentionPct}%`}
              sublabel="Recall"
              accentColor={retentionPct >= 70 ? '#10B981' : '#D89A06'}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#D89A06] font-bold">
              Session Summary
            </span>
            <h2 className="text-2xl font-black text-foreground">
              Reviewed {totalReviewed} {totalReviewed === 1 ? 'Card' : 'Cards'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Next review intervals have been scheduled using SM-2 spaced repetition.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2.5 text-center font-mono tabular-nums">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              <div className="text-lg font-black text-rose-600 dark:text-rose-400">{sessionCounts.again}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Again</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">{sessionCounts.hard}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Hard</div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
              <div className="text-lg font-black text-primary">{sessionCounts.good}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Good</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{sessionCounts.easy}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Easy</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSessionComplete(false);
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setSessionCounts({ again: 0, hard: 0, good: 0, easy: 0 });
              }}
              className="gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Practice Again
            </Button>
            <Button
              onClick={() => {
                setSessionComplete(false);
                setReviewMode(false);
              }}
              className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold px-5 cursor-pointer"
            >
              Back to Course Decks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (reviewMode && dueCards.length > 0) {
    const card = dueCards[currentCardIndex]
    const progressPercent = Math.round(((currentCardIndex + 1) / dueCards.length) * 100);

    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto min-h-[calc(100vh-theme(spacing.16))] flex flex-col justify-between">
        {/* Anki Academic Header Toolbar */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setReviewMode(false)} className="text-xs font-semibold cursor-pointer">
              <ChevronLeft size={16} className="mr-1" /> Exit Review
            </Button>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/60">
                <kbd className="font-bold text-foreground">Space</kbd> flip · <kbd className="font-bold text-foreground">1-4</kbd> grade
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {currentCardIndex + 1} / {dueCards.length}
              </span>
            </div>
          </div>

          {/* Minimal 2px Progress Bar */}
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00004E] via-[#D89A06] to-[#10B981] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stacked 3D Flip Card */}
        <div className="flex-1 flex flex-col items-center justify-center my-auto">
          <div 
            className="w-full aspect-[4/3] max-h-[460px] relative cursor-pointer group"
            style={{ perspective: '1000px' }}
            onClick={() => !isFlipped && setIsFlipped(true)}
          >
            {/* Physical Deck Depth Stack Layers */}
            {currentCardIndex + 2 < dueCards.length && (
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-3xl border border-border/50 bg-card/60 translate-y-4 scale-[0.95] pointer-events-none"
              />
            )}
            {currentCardIndex + 1 < dueCards.length && (
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-3xl border border-border/70 bg-card/85 translate-y-2 scale-[0.975] pointer-events-none"
              />
            )}

            <div 
              className="w-full h-full transition-transform duration-500 relative z-10"
              style={{ 
                transformStyle: 'preserve-3d', 
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
              }}
            >
              {/* Front (Question) */}
              <div 
                className="absolute inset-0 bg-card border-2 border-border/90 rounded-3xl p-8 md:p-10 flex flex-col items-center justify-center text-center shadow-md hover:border-[#D89A06]/60 transition-colors overflow-y-auto"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div className="absolute top-4 right-4">
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-[#00004E] dark:hover:text-[#D89A06]" onClick={(e) => playAudio(card.front, e)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                  <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-[#00004E] dark:hover:text-[#D89A06]" onClick={handleTranslate} disabled={translating}>
                    {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D89A06] mb-5">QUESTION</span>
                <div className="text-xl md:text-2xl font-bold text-foreground leading-relaxed max-w-lg prose dark:prose-invert prose-p:my-1">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {translatedFront || card.front}
                  </ReactMarkdown>
                </div>
                {!isFlipped && (
                  <p className="mt-8 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <RotateCcw size={13} /> Click card or press <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border">Space</kbd> to reveal answer
                  </p>
                )}
              </div>
              
              {/* Back (Answer) */}
              <div 
                className="absolute inset-0 bg-[#00004E] text-white rounded-3xl p-8 md:p-10 flex flex-col items-center justify-center text-center shadow-xl border border-[#D89A06]/40 overflow-y-auto"
                style={{ 
                  backfaceVisibility: 'hidden', 
                  WebkitBackfaceVisibility: 'hidden', 
                  transform: 'rotateY(180deg)' 
                }}
              >
                <div className="absolute top-4 right-4">
                  <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/20" onClick={(e) => playAudio(card.back, e)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                  <Button variant="ghost" size="sm" className="rounded-full text-white/70 hover:text-white hover:bg-white/20 text-xs" onClick={handleTranslate} disabled={translating}>
                    {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full text-white/70 hover:text-white hover:bg-white/20 text-xs" onClick={handleGenerateMnemonics} disabled={mnemonicsLoading}>
                    {mnemonicsLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-[#D89A06]" />}
                    Mnemonic
                  </Button>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D89A06] mb-5">OFFICIAL ANSWER</span>
                <div className="text-lg md:text-xl font-medium leading-relaxed max-w-lg prose prose-invert prose-p:my-1">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {translatedBack || card.back}
                  </ReactMarkdown>
                </div>
                
                {mnemonicsData && (
                  <div className="mt-6 text-left text-xs bg-black/30 border border-white/10 p-3.5 rounded-xl w-full max-w-md">
                    {mnemonicsData.acronym ? <p><strong>Acronym:</strong> {mnemonicsData.acronym}</p> : null}
                    {mnemonicsData.sentence ? <p className="my-1.5"><strong>Sentence:</strong> {mnemonicsData.sentence}</p> : null}
                    {mnemonicsData.rhyme ? <p><strong>Rhyme:</strong> {mnemonicsData.rhyme}</p> : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Anki FSRS SM-2 Rating Controls */}
          <div className={`mt-8 w-full transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <p className="text-center text-xs font-semibold text-muted-foreground mb-3">Recall Difficulty (FSRS SM-2)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto">
              <Button
                size="default"
                variant="outline"
                onClick={() => handleRating('again')}
                disabled={submittingRating}
                className="flex flex-col items-center py-2.5 h-auto border-rose-500/40 hover:bg-rose-500/10 hover:border-rose-500 cursor-pointer text-xs"
              >
                <span className="font-mono text-[10px] text-rose-500 font-bold">[1] Again</span>
                <span className="font-mono text-[11px] font-black text-foreground">&lt; 10 min</span>
              </Button>

              <Button
                size="default"
                variant="outline"
                onClick={() => handleRating('hard')}
                disabled={submittingRating}
                className="flex flex-col items-center py-2.5 h-auto border-amber-500/40 hover:bg-amber-500/10 hover:border-amber-500 cursor-pointer text-xs"
              >
                <span className="font-mono text-[10px] text-amber-500 font-bold">[2] Hard</span>
                <span className="font-mono text-[11px] font-black text-foreground">1 Day</span>
              </Button>

              <Button
                size="default"
                variant="outline"
                onClick={() => handleRating('good')}
                disabled={submittingRating}
                className="flex flex-col items-center py-2.5 h-auto border-[#00004E]/40 dark:border-blue-500/40 hover:bg-[#00004E]/10 dark:hover:bg-blue-500/10 hover:border-[#00004E] cursor-pointer text-xs"
              >
                <span className="font-mono text-[10px] text-[#00004E] dark:text-blue-400 font-bold">[3] Good</span>
                <span className="font-mono text-[11px] font-black text-foreground">3 Days</span>
              </Button>

              <Button
                size="default"
                variant="outline"
                onClick={() => handleRating('easy')}
                disabled={submittingRating}
                className="flex flex-col items-center py-2.5 h-auto border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500 cursor-pointer text-xs"
              >
                <span className="font-mono text-[10px] text-emerald-500 font-bold">[4] Easy</span>
                <span className="font-mono text-[11px] font-black text-foreground">7 Days</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const allDue = flashcards.filter(c => new Date(c.next_review) <= new Date())

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs">
            <Link href="/dashboard/courses" className="font-medium text-muted-foreground hover:text-primary transition-colors flex items-center">
              <ChevronLeft size={15} className="mr-0.5" /> Courses
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href={`/dashboard/courses/${courseId}`} className="font-medium text-muted-foreground hover:text-primary transition-colors">
              Course Workspace
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">Flashcards</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Flashcard Decks</h1>
          <p className="text-sm text-muted-foreground mt-1">Spaced repetition recall cards extracted from your lecture slides.</p>
        </div>

        {flashcards.length > 0 && (
          <Button size="lg" onClick={() => startReview()} className="font-bold bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] shadow-md cursor-pointer">
            <PlayCircle size={18} className="mr-2 text-[#D89A06] dark:text-[#00004E]" />
            {allDue.length > 0 ? `Review ${allDue.length} Due Cards` : `Practice All ${flashcards.length} Cards`}
          </Button>
        )}
      </div>

      {lectures.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-12 text-center space-y-5 shadow-xs flex flex-col items-center">
          <FlashcardStackIllustration className="w-56 h-36" />
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-bold text-foreground">
              No Lecture Decks Uploaded Yet
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload course presentation slides to automatically extract definitions, formulas, and spaced repetition (SM-2) flashcard decks.
            </p>
          </div>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-5 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Layers className="w-4 h-4 mr-1 text-[#D89A06] dark:text-[#00004E]" />
            Go to Course Lectures &amp; Upload Slides
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lectures.map(lec => {
            const lecCards = flashcards.filter(c => c.lecture_id === lec.id)
            const due = lecCards.filter(c => new Date(c.next_review) <= new Date())
            
            return (
              <div key={lec.id} className="p-6 rounded-2xl border border-border/80 bg-card flex flex-col justify-between shadow-xs hover:border-[#D89A06]/50 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-mono font-bold text-[#D89A06] uppercase tracking-wider">
                      Week {lec.week || 1}
                    </span>
                    <h3 className="font-bold text-base text-foreground mt-1 mb-1 truncate">{lec.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    {lecCards.length > 0 && (
                      <Button variant="ghost" size="icon-sm" title="Regenerate Flashcards" onClick={() => handleGenerate(lec.id)} disabled={generatingFor === lec.id} className="text-[#00004E] dark:text-[#D89A06] hover:bg-[#FEF8E7] dark:hover:bg-white/5">
                        <RefreshCw size={15} className={generatingFor === lec.id ? "animate-spin" : ""} />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 space-y-4 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Total Cards:</span>
                    <span className="font-mono font-bold text-foreground">{lecCards.length}</span>
                  </div>
                  {lecCards.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#D89A06]">Due for Review:</span>
                      <span className="font-mono font-bold text-[#D89A06] bg-[#FEF8E7] dark:bg-white/5 px-2 py-0.5 rounded-md border border-[#D89A06]/30">{due.length}</span>
                    </div>
                  )}
                  
                  {lecCards.length === 0 ? (
                    <Button 
                      className="w-full text-xs font-bold cursor-pointer" 
                      variant="secondary"
                      onClick={() => handleGenerate(lec.id)}
                      disabled={generatingFor === lec.id}
                    >
                      {generatingFor === lec.id ? (
                        <><Loader2 size={15} className="mr-2 animate-spin" /> Generating Cards...</>
                      ) : (
                        <><Layers size={15} className="mr-2 text-[#D89A06]" /> Generate Flashcards</>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full text-xs font-bold bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] cursor-pointer" 
                      onClick={() => startReview(lec.id)}
                    >
                      {due.length === 0 ? `Practice Deck (${lecCards.length})` : `Review ${due.length} Due Cards`}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
