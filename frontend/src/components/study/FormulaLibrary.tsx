'use client'

import { useState, useEffect, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Copy, CheckCircle2, Bot, Calculator, Sigma, Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type Formula = {
  id: string
  name: string
  formula: string
  mathExpr: string
  subject: string
}

// Canonical mathematical templates verified dynamically by MathJS CAS
const DYNAMIC_MATHJS_TEMPLATES: Formula[] = [
  { id: 'power_rule', name: 'Power Rule for Derivatives', formula: 'd/dx [x^n] = n * x^(n-1)', mathExpr: 'derivative("x^n", "x")', subject: 'Calculus' },
  { id: 'exp_rule', name: 'Exponential Derivative', formula: 'd/dx [e^(k*x)] = k * e^(k*x)', mathExpr: 'derivative("e^(k*x)", "x")', subject: 'Calculus' },
  { id: 'quad_disc', name: 'Quadratic Discriminant', formula: 'Δ = b² - 4ac', mathExpr: 'b^2 - 4*a*c', subject: 'Algebra' },
  { id: 'pyth_id', name: 'Pythagorean Trig Identity', formula: 'sin²(θ) + cos²(θ) = 1', mathExpr: 'sin(x)^2 + cos(x)^2', subject: 'Trigonometry' },
  { id: 'circle_area', name: 'Area of a Circle', formula: 'A = π * r²', mathExpr: 'pi * r^2', subject: 'Geometry' },
  { id: 'sphere_vol', name: 'Volume of a Sphere', formula: 'V = (4/3) * π * r³', mathExpr: '(4/3) * pi * r^3', subject: 'Geometry' },
  { id: 'hypot_func', name: 'Hypotenuse Function', formula: 'c = √(a² + b²)', mathExpr: 'hypot(a, b)', subject: 'Geometry' },
  { id: 'kinetic_energy', name: 'Kinetic Energy', formula: 'E_k = (1/2) * m * v²', mathExpr: '0.5 * m * v^2', subject: 'Physics' },
  { id: 'mass_energy', name: 'Mass-Energy Equivalence', formula: 'E = m * c²', mathExpr: 'm * speedOfLight^2', subject: 'Physics' },
  { id: 'ohms_law', name: "Ohm's Law", formula: 'V = I * R', mathExpr: 'I * R', subject: 'Physics' },
  { id: 'gravity_force', name: "Newton's Gravitational Force", formula: 'F = G * (m₁ * m₂) / r²', mathExpr: 'gravitationConstant * (m1 * m2) / r^2', subject: 'Physics' },
  { id: 'coulomb_force', name: "Coulomb's Law", formula: 'F = k_e * (|q₁ * q₂|) / r²', mathExpr: 'coulombConstant * (q1 * q2) / r^2', subject: 'Physics' },
]

export function FormulaLibrary({ onCopy }: { onCopy?: (formula: string) => void }) {
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // MathJS Live Expression Evaluator State
  const [mathEvalResult, setMathEvalResult] = useState<{
    expr: string
    result: string
    action: string
    source: string
  } | null>(null)
  const [isEvaluatingMathJS, setIsEvaluatingMathJS] = useState(false)
  const [evalMode, setEvalMode] = useState<'evaluate' | 'simplify' | 'derivative'>('evaluate')

  const [aiFormulas, setAiFormulas] = useState<Formula[]>([])
  const [isSearchingAI, setIsSearchingAI] = useState(false)

  // 1. Dynamic MathJS Formula / Expression Evaluator
  useEffect(() => {
    const q = search.trim()
    const hasMathSyntax = /[=+\-*/^()0-9xX,]/.test(q) || q.toLowerCase().startsWith('derivative') || q.toLowerCase().startsWith('simplify')
    if (!q || q.length < 2 || !hasMathSyntax) {
      setMathEvalResult(null)
      setIsEvaluatingMathJS(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsEvaluatingMathJS(true)
      try {
        const res = await fetch('/api/mathjs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expr: q,
            action: evalMode,
            variable: 'x',
          }),
        })
        const data = await res.json()
        if (data.success && data.result) {
          setMathEvalResult({
            expr: q,
            result: data.result,
            action: data.action || evalMode,
            source: data.source || 'MathJS Expression Evaluator',
          })
        } else {
          setMathEvalResult(null)
        }
      } catch {
        setMathEvalResult(null)
      } finally {
        setIsEvaluatingMathJS(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [search, evalMode])

  // 2. Filter dynamic templates and AI formulas
  const localFiltered = DYNAMIC_MATHJS_TEMPLATES.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.subject.toLowerCase().includes(search.toLowerCase()) ||
      f.formula.toLowerCase().includes(search.toLowerCase()) ||
      f.mathExpr.toLowerCase().includes(search.toLowerCase())
  )

  const allFiltered = [
    ...localFiltered,
    ...aiFormulas.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.subject.toLowerCase().includes(search.toLowerCase())
    ),
  ]

  // 3. Fallback AI search for natural language questions outside standard MathJS syntax
  useEffect(() => {
    if (search.length < 3 || localFiltered.length > 0 || mathEvalResult !== null) return

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingAI(true)
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/ai/search-math`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session && { Authorization: `Bearer ${session.access_token}` }),
            },
            body: JSON.stringify({ type: 'formula', query: search }),
          }
        )

        const result = await res.json()
        if (result.success && result.data) {
          const aiFormula: Formula = {
            id: `ai-${Date.now()}`,
            name: result.data.name,
            formula: result.data.formula,
            mathExpr: result.data.formula,
            subject: result.data.subject,
          }
          setAiFormulas((prev) => [...prev, aiFormula])
        }
      } catch (err) {
        console.error('AI search failed', err)
      } finally {
        setIsSearchingAI(false)
      }
    }, 1000)

    return () => clearTimeout(delayDebounceFn)
  }, [search, localFiltered.length, mathEvalResult])

  const handleCopy = (formulaText: string, id: string) => {
    navigator.clipboard.writeText(formulaText)
    setCopiedId(id)
    if (onCopy) onCopy(formulaText)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-card gap-3">
      {/* Search Input */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Evaluate any formula or expr (e.g. x^2 + 4x, derivative)..."
          value={search}
          onChange={(e) => {
            const val = e.target.value
            startTransition(() => {
              setSearch(val)
            })
          }}
          className="pl-9 bg-muted/50 border-border text-xs sm:text-sm"
        />
        {isEvaluatingMathJS && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
        )}
      </div>

      {/* Mode Selector for MathJS Expression Evaluator */}
      {search.trim().length > 1 && (
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">MathJS Mode:</span>
          {(['evaluate', 'simplify', 'derivative'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEvalMode(mode)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer ${
                evalMode === mode
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 pb-4">
        {/* Live MathJS Expression Evaluator result card */}
        {mathEvalResult && (
          <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Calculator className="w-3.5 h-3.5" />
                <span className="capitalize">MathJS {mathEvalResult.action}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                {mathEvalResult.source}
              </span>
            </div>
            <div className="flex items-center justify-between bg-card p-2 rounded-lg border border-border text-xs font-mono">
              <div className="overflow-x-auto pr-2">
                <span className="text-muted-foreground">{mathEvalResult.expr} → </span>
                <span className="font-bold text-foreground">{mathEvalResult.result}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                onClick={() => handleCopy(mathEvalResult.result, 'eval-formula-result')}
              >
                {copiedId === 'eval-formula-result' ? (
                  <CheckCircle2 size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* AI Searching Indicator */}
        {isSearchingAI && (
          <div className="text-center p-3 border border-purple-500/30 bg-purple-500/10 rounded-lg flex items-center justify-center gap-2 animate-pulse">
            <Bot className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-purple-600 font-medium">Searching AI for '{search}'...</span>
          </div>
        )}

        {/* Empty States */}
        {!isSearchingAI && allFiltered.length === 0 && !mathEvalResult && search.length > 0 && (
          <div className="text-center text-muted-foreground text-xs py-8">
            No formulas found. Enter a mathematical expression to evaluate with MathJS.
          </div>
        )}

        {/* Formula Cards */}
        {allFiltered.map((f) => (
          <div
            key={f.id}
            className="group flex flex-col p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {f.name}
                  {f.id.startsWith('ai-') ? (
                    <Bot className="w-3 h-3 text-purple-500" />
                  ) : (
                    <Sigma className="w-2.5 h-2.5 text-primary opacity-60" />
                  )}
                </h4>
                <span className="text-[9px] font-mono uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                  {f.subject}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => handleCopy(f.formula, f.id)}
                  title="Copy formula"
                >
                  {copiedId === f.id ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </Button>
                {f.mathExpr && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-primary hover:text-primary/80 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => {
                      setSearch(f.mathExpr)
                    }}
                    title="Evaluate in MathJS"
                  >
                    <ArrowRight size={13} />
                  </Button>
                )}
              </div>
            </div>
            <div className="bg-background/60 p-2 rounded-lg border border-border/60 flex items-center justify-between text-xs font-mono text-foreground overflow-x-auto">
              <span className="font-semibold text-primary/90">{f.formula}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
