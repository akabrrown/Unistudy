'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Calculator,
  Send,
  Loader2,
  BrainCircuit,
  LineChart,
  ImagePlus,
  X,
  Copy,
  Check,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FunctionSquare,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

import { solveMathProblemStream } from '@/lib/mathStreamClient'
import { GraphPlotter } from '@/components/study/GraphPlotter'
import { cn } from '@/lib/utils'

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
] as const

const MATH_LEVELS = ['High School', 'Undergraduate', 'Graduate'] as const

type KeypadCategory = 'calculus' | 'algebra' | 'matrix' | 'stats'

const MATH_KEYPAD: Record<
  KeypadCategory,
  { label: string; keys: { display: string; insert: string }[] }
> = {
  calculus: {
    label: 'Calculus',
    keys: [
      { display: 'd/dx', insert: 'Find the derivative of ' },
      { display: '∫ a→b', insert: 'integrate x^2 from 0 to 3' },
      { display: 'lim', insert: 'limit as x -> 0 of ' },
      { display: 'dy/dx =', insert: 'Solve ODE dy/dx = ' },
      { display: 'x^n', insert: 'x^2' },
      { display: 'e^x', insert: 'exp(x)' },
      { display: 'ln(x)', insert: 'log(x)' },
      { display: '√(x)', insert: 'sqrt()' },
    ],
  },
  algebra: {
    label: 'Algebra',
    keys: [
      { display: 'Solve =', insert: 'Solve ' },
      { display: 'System', insert: 'Solve 2x + y = 7, x - y = 2' },
      { display: 'x²', insert: '^2' },
      { display: '()', insert: '()' },
      { display: '±', insert: '+/-' },
      { display: '≤', insert: '<=' },
      { display: '≥', insert: '>=' },
      { display: 'π', insert: 'pi' },
    ],
  },
  matrix: {
    label: 'Matrices',
    keys: [
      { display: 'det(A)', insert: 'det([[1, 2], [3, 4]])' },
      { display: 'inv(A)', insert: 'inv([[1, 2], [3, 4]])' },
      { display: '2×2 [[...]]', insert: '[[1, 0], [0, 1]]' },
      { display: 'A * B', insert: ' * ' },
      { display: 'transpose', insert: 'transpose([[1, 2], [3, 4]])' },
      { display: 'eigenvalues', insert: 'Find eigenvalues of [[4, 1], [2, 3]]' },
    ],
  },
  stats: {
    label: 'Trig & Stats',
    keys: [
      { display: 'sin(x)', insert: 'sin(x)' },
      { display: 'cos(x)', insert: 'cos(x)' },
      { display: 'tan(x)', insert: 'tan(x)' },
      { display: 'Mean & SD', insert: 'Find mean and standard deviation of 2, 4, 4, 4, 5, 5, 7, 9' },
      { display: 'P(A|B)', insert: 'Conditional probability P(A|B) ' },
      { display: 'nCr', insert: 'combinations(n, r)' },
    ],
  },
}

const EXAMPLE_PROBLEMS = [
  {
    tag: 'Calculus',
    text: 'Find the derivative of x^3 + 2*x^2 - 5*x + 7 with respect to x',
  },
  {
    tag: 'Definite Integral',
    text: 'integrate x^2 * sin(x) from 0 to pi',
  },
  {
    tag: 'Complex Roots',
    text: 'Solve x^2 + 2x + 5 = 0',
  },
  {
    tag: 'Linear System',
    text: 'Solve 2x + y = 7, x - y = 2',
  },
  {
    tag: 'Matrix Determinant',
    text: 'det([[1, 2, 3], [0, 4, 5], [1, 0, 6]])',
  },
  {
    tag: 'Statistics',
    text: 'Find mean, median, and standard deviation of 12, 15, 18, 22, 25, 28',
  },
] as const

interface SolvedHistoryEntry {
  id: string
  problem: string
  subject: string
  level: string
  result: string
  timestamp: string
}

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
  const [subject, setSubject] = useState<string>('Mathematics')
  const [level, setLevel] = useState<string>('Undergraduate')
  const [keypadCat, setKeypadCat] = useState<KeypadCategory>('calculus')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState('image/png')
  const [isComputing, setIsComputing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<SolvedHistoryEntry[]>([])

  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current
    if (!el) {
      setProblem((prev) => (prev ? `${prev} ${snippet}` : snippet))
      return
    }
    const start = el.selectionStart ?? problem.length
    const end = el.selectionEnd ?? problem.length
    const next = `${problem.slice(0, start)}${snippet}${problem.slice(end)}`
    setProblem(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + snippet.length
      el.setSelectionRange(caret, caret)
    })
  }

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

  async function runSolve(problemOverride?: string) {
    const activeProblem = (problemOverride ?? problem).trim()
    if (!activeProblem && !imagePreview) return
    if (problemOverride !== undefined) {
      setProblem(problemOverride)
    }

    setIsComputing(true)
    setResult('')
    setError(null)
    setCopied(false)

    try {
      const finalOutput = await solveMathProblemStream({
        problem: activeProblem,
        subject,
        level,
        imageBase64: imagePreview,
        mimeType: imageMime,
        onChunk: (fullText) => setResult(fullText),
      })

      if (finalOutput && finalOutput.trim()) {
        setHistory((prev) => [
          {
            id: `${Date.now()}`,
            problem: activeProblem || 'Image Question',
            subject,
            level,
            result: finalOutput,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 5),
        ])
      }
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to compute problem')
    } finally {
      setIsComputing(false)
    }
  }

  const handleCopyResult = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard unavailable
    }
  }

  const handleReset = () => {
    setProblem('')
    setImagePreview(null)
    setResult('')
    setError(null)
    setCopied(false)
  }

  return (
    <div className="max-w-[1380px] mx-auto pb-10 space-y-5">
      {/* Studio Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold">
              Course Computation Suite
            </span>
            <span aria-hidden="true">/</span>
            <span>CAS + Vision + Cartesian Geometry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-primary" strokeWidth={1.75} />
            Math Solver &amp; Graph Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {history.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {history.length} solved in session
            </span>
          ) : null}

          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('solver')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer',
                activeTab === 'solver'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calculator className="w-4 h-4 text-primary" />
              Math Solver
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer',
                activeTab === 'graph'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LineChart className="w-4 h-4 text-primary" />
              Graph Plotter
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'graph' ? (
        <GraphPlotter fullHeight />
      ) : (
        /* Dual-Pane Symbolab x WolframAlpha Solver Studio */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Workbench: Problem Editor, Math Keypad, Templates & History (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3.5">
              {/* Context Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    aria-label="Math Subject"
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
                  >
                    {MATH_SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    aria-label="Academic Level"
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
                  >
                    {MATH_LEVELS.map((lv) => (
                      <option key={lv} value={lv}>{lv}</option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              </div>

              {/* Image Preview Strip */}
              {imagePreview ? (
                <div className="flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Image
                      src={imagePreview}
                      alt="Math problem screenshot"
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded-lg object-cover border border-border"
                    />
                    <span className="text-xs font-medium text-foreground truncate">Question image attached</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setImagePreview(null)}
                    aria-label="Remove attached image"
                    className="cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : null}

              {/* Equation / Natural Language Input */}
              <div className="space-y-2">
                <label htmlFor="math-problem-input" className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Problem Statement or Equation
                </label>
                <textarea
                  id="math-problem-input"
                  ref={textareaRef}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Type equations, calculus, matrices, statistics, word problems, or paste a screenshot (Ctrl+V)..."
                  rows={4}
                  className="w-full resize-y min-h-[108px] rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/70"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void runSolve()
                    }
                  }}
                />
              </div>

              {/* Submit + Image Upload Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                    className="h-9 text-xs gap-1.5 cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Upload Question Photo
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void runSolve()}
                  disabled={isComputing || (!problem.trim() && !imagePreview)}
                  className="h-9 px-4 text-xs font-semibold bg-[#5B2D8E] dark:bg-primary hover:bg-[#492274] text-white gap-1.5 cursor-pointer"
                >
                  {isComputing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Solving...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Solve Step-by-Step
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* Tabbed Symbolab-Style Syntax Keypad */}
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <FunctionSquare className="w-3.5 h-3.5 text-primary" />
                  Math Input Keypad
                </span>
                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-[11px]">
                  {(Object.keys(MATH_KEYPAD) as KeypadCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setKeypadCat(cat)}
                      className={cn(
                        'px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer',
                        keypadCat === cat
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {MATH_KEYPAD[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {MATH_KEYPAD[keypadCat].keys.map((item) => (
                  <button
                    key={item.display}
                    type="button"
                    onClick={() => insertSnippet(item.insert)}
                    className="rounded-lg border border-border/80 bg-muted/25 hover:bg-muted/70 hover:border-primary/40 py-2 px-2 font-mono text-xs font-medium text-foreground transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {item.display}
                  </button>
                ))}
              </div>
            </section>

            {/* Sample Query Starters */}
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                One-Click Example Problems
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_PROBLEMS.map((ex) => (
                  <button
                    key={ex.tag}
                    type="button"
                    onClick={() => void runSolve(ex.text)}
                    disabled={isComputing}
                    className="text-left rounded-xl border border-border/70 bg-muted/25 hover:bg-muted/60 hover:border-primary/40 p-2.5 transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
                      {ex.tag}
                    </div>
                    <div className="text-xs text-foreground font-medium line-clamp-1 mt-0.5">
                      {ex.text}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Session History */}
            {history.length > 0 ? (
              <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Recent Computations
                </div>
                <ul className="divide-y divide-border/60">
                  {history.map((entry) => (
                    <li key={entry.id} className="py-2 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => {
                          setProblem(entry.problem)
                          setSubject(entry.subject)
                          setLevel(entry.level)
                          setResult(entry.result)
                          setError(null)
                        }}
                        className="w-full text-left flex items-center justify-between gap-2 group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                            {entry.problem}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {entry.subject} · {entry.level}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                          {entry.timestamp}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Right Pane: Wolfram-Style Computation Output & Inspector (7 cols) */}
          <section className="lg:col-span-7 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col min-h-[580px]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Step-by-Step Derivation</span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {subject} · {level}
                </span>
                {isComputing ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Computing
                  </span>
                ) : result ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </span>
                ) : null}
              </div>

              {result ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopyResult()}
                  className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy LaTeX
                    </>
                  )}
                </Button>
              ) : null}
            </div>

            <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">Computation failed</p>
                    <p className="text-xs opacity-90">{error}</p>
                  </div>
                </div>
              ) : null}

              {!result && !isComputing && !error ? (
                <div className="space-y-6 py-4">
                  <div className="text-center max-w-md mx-auto space-y-2">
                    <BrainCircuit className="w-10 h-10 text-primary/40 mx-auto" strokeWidth={1.5} />
                    <h2 className="text-base font-bold text-foreground">
                      Symbolic CAS + Step-by-Step Proof Engine
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Arithmetic, derivatives, definite integrals, simultaneous equations, matrices, and descriptive statistics are verified deterministically before the AI writes step-by-step working.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">CALCULUS &amp; ODES</div>
                      <p className="text-xs text-muted-foreground">
                        Symbolic differentiation, Simpson definite integration, limits, series, and differential equations.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">ALGEBRA &amp; MATRICES</div>
                      <p className="text-xs text-muted-foreground">
                        Real &amp; complex quadratic roots, Gaussian elimination for linear systems, determinants, and inverses.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">PROBABILITY &amp; STATS</div>
                      <p className="text-xs text-muted-foreground">
                        Mean, median, population &amp; sample standard deviation, variance, distributions, and hypothesis tests.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">VISION OCR INPUT</div>
                      <p className="text-xs text-muted-foreground">
                        Paste screenshots directly (`Ctrl+V`) or upload handwritten/printed math exam questions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {result ? (
                <div className="prose prose-slate dark:prose-invert max-w-none w-full prose-headings:text-primary prose-headings:font-bold prose-strong:text-foreground prose-li:my-1 prose-p:leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {result}
                  </ReactMarkdown>
                </div>
              ) : null}

              {isComputing && !result ? (
                <div className="flex items-center gap-2.5 text-primary font-medium py-8 justify-center text-sm">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Running CAS check and generating step-by-step working...
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
