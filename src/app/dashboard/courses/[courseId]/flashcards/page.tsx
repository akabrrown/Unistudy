'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateFlashcards, submitFlashcardReview } from '@/app/actions/flashcards'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Loader2, BrainCircuit, Check, X, RotateCcw, Volume2 } from 'lucide-react'
import { Rating } from '@/lib/utils/sm2'

export default function FlashcardsPage() {
  const params = useParams()
  const courseId = params.courseId as string
  
  const [lectures, setLectures] = useState<any[]>([])
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  // Review mode state
  const [reviewMode, setReviewMode] = useState(false)
  const [dueCards, setDueCards] = useState<any[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [submittingRating, setSubmittingRating] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [courseId])

  async function fetchData() {
    setLoading(true)
    let { data: lecs } = await supabase.from('lectures').select('id, title, week').eq('course_id', courseId).order('week', { ascending: true })
    
    // Fallback for demo purposes if DB is empty (since we haven't built the upload pipeline yet)
    if (!lecs || lecs.length === 0) {
      lecs = [{ id: '00000000-0000-0000-0000-000000000001', title: 'Lecture 14: DNA Replication', week: 8 }]
    }

    setLectures(lecs)
    const lecIds = lecs.map((l: any) => l.id)
    
    // Fetch flashcards using Server Action to bypass RLS
    const { getFlashcards } = await import('@/app/actions/flashcards')
    const res = await getFlashcards(lecIds)
    if (res.data) setFlashcards(res.data)
    
    setLoading(false)
  }

  async function handleGenerate(lectureId: string) {
    setGeneratingFor(lectureId)
    const res = await generateFlashcards(lectureId)
    if (res.error) {
      alert(res.error)
    } else {
      await fetchData()
    }
    setGeneratingFor(null)
  }

  function startReview(lectureId?: string) {
    const now = new Date().toISOString()
    let pool = flashcards.filter(c => new Date(c.next_review) <= new Date(now))
    
    if (lectureId) {
      pool = pool.filter(c => c.lecture_id === lectureId)
    }
    
    if (pool.length === 0) {
      alert("No flashcards are currently due for review!")
      return
    }

    setDueCards(pool)
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setReviewMode(true)
  }

  async function handleRating(rating: Rating) {
    const card = dueCards[currentCardIndex]
    setSubmittingRating(true)
    
    const res = await submitFlashcardReview(card.id, rating, {
      ease_factor: card.ease_factor,
      interval_days: card.interval_days,
      repetitions: card.repetitions
    })
    
    setSubmittingRating(false)
    
    if (res.error) {
      alert(res.error)
      return
    }

    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setIsFlipped(false)
    } else {
      // Finished
      setReviewMode(false)
      fetchData() // refresh to hide completed cards
    }
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
      alert('Text-to-speech is not supported in your browser.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (reviewMode && dueCards.length > 0) {
    const card = dueCards[currentCardIndex]
    return (
      <div className="p-8 max-w-3xl mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setReviewMode(false)}>
            <ChevronLeft size={16} className="mr-2" /> Exit Review
          </Button>
          <div className="text-sm font-semibold text-muted-foreground">
            Card {currentCardIndex + 1} of {dueCards.length}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div 
            className="w-full aspect-[4/3] max-h-[500px] relative cursor-pointer group"
            style={{ perspective: '1000px' }}
            onClick={() => !isFlipped && setIsFlipped(true)}
          >
            <div 
              className="w-full h-full transition-transform duration-500 relative"
              style={{ 
                transformStyle: 'preserve-3d', 
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
              }}
            >
              {/* Front */}
              <div 
                className="absolute inset-0 bg-card border-2 border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-lg hover:border-primary/50 transition-colors"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div className="absolute top-4 right-4">
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary" onClick={(e) => playAudio(card.front, e)}>
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Question</span>
                <h3 className="text-2xl font-bold text-foreground leading-relaxed">{card.front}</h3>
                {!isFlipped && (
                  <p className="mt-8 text-sm font-medium text-muted-foreground animate-pulse flex items-center gap-2">
                    <RotateCcw size={14} /> Click to flip
                  </p>
                )}
              </div>
              
              {/* Back */}
              <div 
                className="absolute inset-0 bg-primary text-primary-foreground rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl"
                style={{ 
                  backfaceVisibility: 'hidden', 
                  WebkitBackfaceVisibility: 'hidden', 
                  transform: 'rotateY(180deg)' 
                }}
              >
                <div className="absolute top-4 right-4">
                  <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/70 hover:text-white hover:bg-white/20" onClick={(e) => playAudio(card.back, e)}>
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70 mb-6">Answer</span>
                <div className="text-xl font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: card.back }} />
              </div>
            </div>
          </div>

          <div className={`mt-12 w-full transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <p className="text-center text-sm font-semibold text-muted-foreground mb-4">How hard was it to remember?</p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" variant="destructive" onClick={() => handleRating('again')} disabled={submittingRating} className="w-32 font-bold">
                Again (1m)
              </Button>
              <Button size="lg" variant="secondary" onClick={() => handleRating('hard')} disabled={submittingRating} className="w-32 font-bold bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">
                Hard
              </Button>
              <Button size="lg" variant="secondary" onClick={() => handleRating('good')} disabled={submittingRating} className="w-32 font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                Good
              </Button>
              <Button size="lg" variant="default" onClick={() => handleRating('easy')} disabled={submittingRating} className="w-32 font-bold bg-green-500 text-white hover:bg-green-600">
                Easy
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
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/courses" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center">
              <ChevronLeft size={16} className="mr-1" /> Courses
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-medium text-foreground">Flashcards</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Flashcard Deck</h1>
          <p className="text-muted-foreground mt-1">Review your AI-generated flashcards using spaced repetition.</p>
        </div>

        {allDue.length > 0 && (
          <Button size="lg" onClick={() => startReview()} className="font-bold shadow-lg shadow-primary/20">
            <BrainCircuit size={18} className="mr-2" />
            Review {allDue.length} Due Cards
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lectures.map(lec => {
          const lecCards = flashcards.filter(c => c.lecture_id === lec.id)
          const due = lecCards.filter(c => new Date(c.next_review) <= new Date())
          
          return (
            <div key={lec.id} className="p-6 rounded-xl border border-border bg-card flex flex-col">
              <h3 className="font-bold text-lg mb-1 truncate">{lec.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">Week {lec.week}</p>
              
              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Total Cards:</span>
                  <span className="font-bold">{lecCards.length}</span>
                </div>
                {lecCards.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-orange-500">Due for Review:</span>
                    <span className="font-bold text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full">{due.length}</span>
                  </div>
                )}
                
                {lecCards.length === 0 ? (
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => handleGenerate(lec.id)}
                    disabled={generatingFor === lec.id}
                  >
                    {generatingFor === lec.id ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><BrainCircuit size={16} className="mr-2" /> Generate Cards</>
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full font-bold" 
                    disabled={due.length === 0}
                    onClick={() => startReview(lec.id)}
                  >
                    Review Lecture
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
