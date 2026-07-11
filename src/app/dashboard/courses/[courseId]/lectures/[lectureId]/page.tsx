'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Download, MoreHorizontal, Microscope, Volume2, PenTool, StickyNote, Monitor, Eye, Loader2 } from 'lucide-react'
import { generateSlideExplanation } from '@/app/actions/explain'
import { Button } from '@/components/ui/button'

const MOCK_SLIDES = [
  {
    id: 1,
    title: 'DNA Replication',
    subtitle: 'The semi-conservative model — Meselson & Stahl experiment',
    rawText: 'DNA replication is the process by which a cell copies its DNA before cell division. The process follows the semi-conservative model, meaning each new double helix consists of one original strand and one newly synthesised strand. Key enzymes: Helicase, Primase, DNA Polymerase III, Ligase. The leading strand is synthesised continuously while the lagging strand is built in short Okazaki fragments, which are later joined by DNA ligase.',
    tags: ['Helicase', 'Primase', 'DNA Polymerase III', 'Ligase']
  },
  {
    id: 2,
    title: 'Enzymes of Replication',
    subtitle: 'Functions and Roles in the Replication Fork',
    rawText: 'Helicase unwinds the DNA double helix. Primase synthesizes RNA primers to provide a 3-OH group. DNA Polymerase III adds nucleotides in a 5 to 3 direction. Ligase joins the nicks between Okazaki fragments. Topoisomerase relieves supercoiling ahead of the replication fork.',
    tags: ['Topoisomerase', 'Replication Fork', 'RNA Primer']
  },
  {
    id: 3,
    title: 'Okazaki Fragments',
    subtitle: 'Lagging Strand Synthesis',
    rawText: 'Because DNA synthesis can only occur in the 5 to 3 direction, the lagging strand is synthesized discontinuously in short segments called Okazaki fragments. These fragments require multiple RNA primers and are eventually sealed by DNA Ligase to form a continuous strand.',
    tags: ['Lagging Strand', 'Okazaki', 'Discontinuous']
  }
]

export default function LectureViewer() {
  const params = useParams()
  const [slideIndex, setSlideIndex] = useState(0)
  const [level, setLevel] = useState('Med')
  const [confidence, setConfidence] = useState<number | null>(null)
  
  const [explanation, setExplanation] = useState<string>('')
  const [loadingAI, setLoadingAI] = useState(false)

  const currentSlide = MOCK_SLIDES[slideIndex]
  const totalSlides = MOCK_SLIDES.length

  useEffect(() => {
    async function fetchExplanation() {
      setLoadingAI(true)
      const res = await generateSlideExplanation(currentSlide.rawText, level, 'BIOL3012: Molecular Biology')
      if (res.error) {
        setExplanation(`<p class="text-destructive font-semibold">${res.error}</p>`)
      } else {
        setExplanation(res.explanation || '')
      }
      setLoadingAI(false)
    }
    
    fetchExplanation()
  }, [slideIndex, level, currentSlide.rawText])

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col overflow-hidden bg-background absolute inset-0 z-50">
      {/* Top bar */}
      <div className="h-14 flex-shrink-0 flex items-center gap-3 px-5 border-b border-border bg-card">
        <Link href="/dashboard/courses" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft size={16} /> Back to Courses
        </Link>
        <span className="text-border">|</span>
        <span className="text-sm font-semibold text-foreground truncate">BIOL3012 — Lecture 14: DNA Replication</span>
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground ml-auto">Week 8</span>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-primary"><Download size={16} /></Button>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-primary"><MoreHorizontal size={16} /></Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Slide panel */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          {/* Slide display */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-muted/10">
            <div className="w-full max-w-3xl aspect-video rounded-2xl border border-border shadow-md flex items-center justify-center relative overflow-hidden bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-50" />
              <div className="relative text-center space-y-4 p-8">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Microscope size={32} className="text-primary-foreground" />
                </div>
                <h2 className="text-3xl font-bold text-foreground tracking-tight">{currentSlide.title}</h2>
                <p className="text-muted-foreground text-lg">{currentSlide.subtitle}</p>
                <div className="flex gap-2 justify-center flex-wrap pt-4">
                  {currentSlide.tags.map(t => (
                    <span key={t} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Nav strip */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-border bg-card">
            <Button variant="ghost" size="icon" onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))} disabled={slideIndex === 0}>
              <ChevronLeft size={20} />
            </Button>
            <span className="text-sm font-semibold text-foreground">Slide {slideIndex + 1} of {totalSlides}</span>
            <Button variant="ghost" size="icon" onClick={() => setSlideIndex(Math.min(totalSlides - 1, slideIndex + 1))} disabled={slideIndex === totalSlides - 1}>
              <ChevronRight size={20} />
            </Button>
          </div>

          {/* Thumbnail strip */}
          <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-t border-border bg-muted/30 scrollbar-hide">
            {MOCK_SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlideIndex(i)}
                className={`flex-shrink-0 w-20 h-12 rounded-lg border-2 transition-all ${i === slideIndex ? 'border-primary' : 'border-border bg-card hover:border-primary/50'}`}>
                <div className="w-full h-full flex items-center justify-center">
                  <span className={`text-xs font-bold ${i === slideIndex ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Explanation panel */}
        <div className="w-[400px] flex-shrink-0 flex flex-col overflow-hidden bg-card">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-1 px-4 py-3 border-b border-border">
            {[Volume2, PenTool, StickyNote, Monitor, Eye].map((Icon, i) => (
              <Button key={i} variant={i === 0 ? "secondary" : "ghost"} size="icon-sm" className={i === 0 ? "text-primary bg-primary/10" : "text-muted-foreground"}>
                <Icon size={16} />
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Level</span>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                {['ELI5', 'Med', 'Expert'].map((l) => (
                  <button key={l} onClick={() => setLevel(l)} className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${level === l ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Explanation text */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-xs font-bold tracking-widest uppercase text-primary">AI Explanation</p>
              </div>
              
              {loadingAI ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4">
                  <Loader2 size={32} className="animate-spin text-primary/50" />
                  <p className="text-sm font-medium animate-pulse">Generating tailored explanation...</p>
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-foreground space-y-4 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul>li]:mb-2 [&>strong]:text-primary [&>strong]:font-bold" 
                     dangerouslySetInnerHTML={{ __html: explanation }} />
              )}
            </div>
          </div>

          {/* Confidence meter */}
          <div className="flex-shrink-0 p-5 border-t border-border bg-muted/10">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-4 text-center">How confident are you?</p>
            <div className="flex gap-2 justify-center">
              {['😕', '😐', '🙂', '😊', '💪'].map((emoji, i) => (
                <button key={i} onClick={() => setConfidence(i)}
                  className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all
                    ${confidence === i ? 'bg-primary/10 ring-2 ring-primary scale-110 shadow-lg shadow-primary/20' : 'bg-card border border-border hover:bg-muted hover:scale-105'}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
