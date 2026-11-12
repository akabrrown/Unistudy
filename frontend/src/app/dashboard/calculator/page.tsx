'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Calculator, Send, Loader2, BrainCircuit, LineChart, ImagePlus, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

import { solveMathProblemStream } from '@/lib/mathStreamClient'
import { GraphPlotter } from '@/components/study/GraphPlotter'

const MATH_SUBJECTS = [
  'Mathematics',
  'Calculus',
  'Algebra & Linear Algebra',
  'Trigonometry & Geometry',
  'Statistics & Probability',
  'Differential Equations',
  'Discrete Math',
  'Physics',
  'Chemistry',
]

const MATH_LEVELS = ['High School', 'Undergraduate', 'Graduate']

export default function CalculatorPage() {
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const [manualTab, setManualTab] = useState<{ forUrl: string | null; tab: 'solver' | 'graph' } | null>(null)
  const activeTab: 'solver' | 'graph' =
    manualTab && manualTab.forUrl === urlTab
      ? manualTab.tab
      : urlTab === 'graph'
        ? 'graph'
        : 'solver'
  const setActiveTab = (tab: 'solver' | 'graph') => setManualTab({ forUrl: urlTab, tab })
  const [problem, setProblem] = useState('')
  const [subject, setSubject] = useState('Mathematics')
  const [level, setLevel] = useState('Undergraduate')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState('image/png')
  const [isComputing, setIsComputing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  const handleImageFile = (file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds 5 MB. Please upload a smaller screenshot.')
      return
    }
    setError(null)
    setImageMime(file.type)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        handleImageFile(item.getAsFile())
        break
      }
    }
  }

  async function handleSolve() {
    if (!problem.trim() && !imagePreview) return

    setIsComputing(true)
    setResult('')
    setError(null)

    try {
      await solveMathProblemStream({
        problem,
        subject,
        level,
        imageBase64: imagePreview,
        mimeType: imageMime,
        onChunk: (fullText) => setResult(fullText),
      })
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to compute problem')
    } finally {
      setIsComputing(false)
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="text-primary" /> AI Math & Graph Toolkit
          </h1>
          <p className="text-muted-foreground mt-1">
            Solve step-by-step algebra, calculus, and coordinate geometry graph questions from text or screenshots.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('solver')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'solver'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="w-4 h-4 text-primary" />
            AI Math Solver
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'graph'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LineChart className="w-4 h-4 text-purple-500" />
            Graph Plotter & Solver
          </button>
        </div>
      </div>

      {activeTab === 'graph' ? (
        <div className="flex-1 min-h-0 bg-card border border-border rounded-xl shadow-sm p-4 sm:p-5 overflow-hidden">
          <GraphPlotter fullHeight />
        </div>
      ) : (
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        {/* Output Panel */}
        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-y-auto p-6 relative">
          {!result && !isComputing && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60 p-8 text-center space-y-4">
              <BrainCircuit size={48} className="opacity-20" />
              <p className="font-medium text-lg">Enter a complex problem below to begin.</p>
              <p className="text-sm max-w-sm">Equations can be written normally (e.g. integrate x^2 from 0 to 5) and the AI will format them automatically.</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium">
              Error: {error}
            </div>
          )}

          {result && (
            <div className="prose prose-slate dark:prose-invert max-w-none w-full
              prose-headings:text-primary prose-headings:font-bold
              prose-strong:text-foreground
              prose-li:my-1
              prose-p:leading-relaxed"
            >
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {result}
              </ReactMarkdown>
            </div>
          )}
          
          {isComputing && !result && (
            <div className="flex items-center gap-2 text-primary font-medium p-4">
              <Loader2 className="animate-spin" size={20} />
              Analysing problem...
            </div>
          )}
          <div ref={endRef} />
        </div>
        
        {/* Input Panel */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="Math Subject"
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none"
              >
                {MATH_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                aria-label="Academic Level"
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none"
              >
                {MATH_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  handleImageFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload Question Image
              </Button>
            </div>
          </div>

          {imagePreview && (
            <div className="relative z-10 flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src={imagePreview}
                  alt="Math problem screenshot"
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 rounded object-cover border border-border"
                />
                <span className="text-xs text-muted-foreground truncate">Question image attached</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setImagePreview(null)}
                aria-label="Remove attached image"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <div className="flex gap-4 items-end relative z-10">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              onPaste={handlePaste}
              placeholder="Enter ANY math question (calculus, ODEs, matrices, statistics, word problems, proofs) or paste/upload a screenshot..."
              className="min-h-[84px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent flex-1 text-base w-full outline-none p-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSolve()
                }
              }}
            />
            <div className="flex-shrink-0 pb-1">
              <Button
                size="lg"
                className="rounded-full w-12 h-12 p-0 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
                onClick={handleSolve}
                disabled={isComputing || (!problem.trim() && !imagePreview)}
              >
                {isComputing ? <Loader2 className="animate-spin" /> : <Send size={20} className="ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
