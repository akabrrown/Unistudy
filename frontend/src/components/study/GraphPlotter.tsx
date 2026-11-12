'use client'

import React, { useState, useMemo, useRef, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { compile, range } from 'mathjs'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertCircle,
  Loader2,
  ImagePlus,
  X,
  FunctionSquare,
  Compass,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
  SlidersHorizontal,
} from 'lucide-react'
import {
  parseDeterministicGraphProblem,
  type GraphSpec,
} from '../../../../shared/lib/graphSolver'
import { cn } from '@/lib/utils'

// Dynamic import of Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 animate-pulse rounded-lg text-muted-foreground text-sm">
      Loading interactive graph sheet...
    </div>
  ),
})

const FUNCTION_COLORS = ['#5B2D8E', '#0284c7', '#059669', '#d97706', '#dc2626']

interface ExpressionEntry {
  id: string
  expression: string
  visible: boolean
  color: string
}

const GRAPH_EXAM_PRESETS = [
  {
    label: 'Quadrilateral & Reflection',
    prompt:
      'Draw quadrilateral ABCD with A(2,4), B(2,8), C(8,8), D(8,4). Draw its image A1B1C1D1 under translation by vector (-5,-2) and A2B2C2D2 under reflection in the y-axis. Find the gradient of A2B1.',
  },
  {
    label: 'Parabola & Line Intersection',
    prompt: 'Plot y = x^2 - 4 and y = 2*x - 1 on [-6, 6]',
  },
  {
    label: 'Simultaneous Linear System',
    prompt: 'Plot 2*x + y = 7 and x - y = 2 on [-4, 8]',
  },
  {
    label: 'Damped Trig Wave',
    prompt: 'Plot y = sin(x) * x and y = cos(x) * 2 on [-10, 10]',
  },
] as const

const QUICK_EXPR_CHIPS = [
  'x^2 - 4',
  '2*x + 1',
  'sin(x) * x',
  'cos(2*x)',
  'abs(x) - 2',
  'sqrt(abs(x))',
] as const

type PlotDataList = NonNullable<ComponentProps<typeof Plot>['data']>

function buildPlotlyData(spec: GraphSpec): { traces: PlotDataList; evalError: string | null } {
  const traces: PlotDataList = []
  let evalError: string | null = null

  // 1. Plot continuous mathematical functions
  spec.functions.forEach((fn, idx) => {
    try {
      const compiled = compile(fn.expression)
      const dMin = fn.domain ? fn.domain[0] : spec.xAxis.min
      const dMax = fn.domain ? fn.domain[1] : spec.xAxis.max
      const step = Math.max(0.02, (dMax - dMin) / 250)
      const xVals = range(dMin, dMax + step / 2, step).toArray() as number[]
      const yVals = xVals.map((x) => {
        try {
          const val = compiled.evaluate({ x })
          if (typeof val !== 'number' || !Number.isFinite(val) || Math.abs(val) > 1e5) {
            return null
          }
          return val
        } catch {
          return null
        }
      })

      traces.push({
        x: xVals,
        y: yVals,
        type: 'scatter',
        mode: 'lines',
        line: {
          color: fn.color || FUNCTION_COLORS[idx % FUNCTION_COLORS.length],
          width: 2.5,
        },
        name: fn.label || `f(x) = ${fn.expression}`,
        connectgaps: false,
      })
    } catch (err: unknown) {
      evalError = err instanceof Error ? err.message : `Invalid expression: ${fn.expression}`
    }
  })

  // 2. Plot polygons, triangles, quadrilaterals, and line segments
  spec.shapes.forEach((shape, idx) => {
    if (!shape.vertices || shape.vertices.length < 2) return
    const color = shape.color || FUNCTION_COLORS[idx % FUNCTION_COLORS.length]
    const loopVertices = shape.closed ? [...shape.vertices, shape.vertices[0]] : shape.vertices

    traces.push({
      x: loopVertices.map((v) => v.x),
      y: loopVertices.map((v) => v.y),
      type: 'scatter',
      mode: 'lines+markers+text',
      name: shape.name,
      fill: shape.closed && shape.fill !== false ? 'toself' : 'none',
      fillcolor: shape.closed && shape.fill !== false ? `${color}1f` : undefined,
      line: {
        color,
        width: shape.closed ? 2.5 : 2,
        dash: shape.dash || 'solid',
      },
      marker: {
        size: 7,
        color,
      },
      text: loopVertices.map((v, vIdx) =>
        shape.closed && vIdx === loopVertices.length - 1
          ? ''
          : `${v.label}(${v.x},${v.y})`
      ),
      textposition: 'top center',
      textfont: {
        size: 11,
        color,
      },
    })
  })

  // 3. Plot standalone labeled points
  if (spec.points.length > 0) {
    traces.push({
      x: spec.points.map((p) => p.x),
      y: spec.points.map((p) => p.y),
      type: 'scatter',
      mode: 'markers+text',
      name: 'Points',
      marker: {
        size: 9,
        color: '#ef4444',
      },
      text: spec.points.map((p) => `${p.label}(${p.x},${p.y})`),
      textposition: 'top right',
      textfont: {
        size: 11,
        color: '#ef4444',
      },
    })
  }

  return { traces, evalError }
}

function buildSampleValueRows(spec: GraphSpec): {
  xs: number[]
  columns: { label: string; color: string; values: string[] }[]
} {
  if (spec.functions.length === 0) return { xs: [], columns: [] }
  const xMin = spec.xAxis.min
  const xMax = spec.xAxis.max
  const step = Math.max(1, Math.round(((xMax - xMin) / 8) * 10) / 10)
  const xs: number[] = []
  for (let x = xMin; x <= xMax + 1e-9 && xs.length < 9; x += step) {
    xs.push(Math.round(x * 100) / 100)
  }

  const columns = spec.functions.slice(0, 3).map((fn, idx) => {
    let compiled: { evaluate: (scope?: Record<string, number>) => unknown } | null = null
    try {
      compiled = compile(fn.expression)
    } catch {
      compiled = null
    }
    const values = xs.map((x) => {
      if (!compiled) return '--'
      try {
        const res = compiled.evaluate({ x })
        if (typeof res !== 'number' || !Number.isFinite(res)) return 'undef'
        return String(Math.round(res * 1000) / 1000)
      } catch {
        return 'undef'
      }
    })
    return {
      label: fn.label || `f${idx + 1}(x)`,
      color: fn.color || FUNCTION_COLORS[idx % FUNCTION_COLORS.length],
      values,
    }
  })

  return { xs, columns }
}

export function GraphPlotter({ fullHeight = false }: { fullHeight?: boolean }) {
  const [mode, setMode] = useState<'solve' | 'quick'>('solve')
  const [canvasTab, setCanvasTab] = useState<'plot' | 'inspector'>('plot')
  const [exprStr, setExprStr] = useState('sin(x) * x')
  const [expressions, setExpressions] = useState<ExpressionEntry[]>([
    { id: 'expr-1', expression: 'sin(x) * x', visible: true, color: FUNCTION_COLORS[0] },
    { id: 'expr-2', expression: 'x * 0.5', visible: true, color: FUNCTION_COLORS[1] },
  ])
  const [xMin, setXMin] = useState(-10)
  const [xMax, setXMax] = useState(10)
  const [yMin, setYMin] = useState(-10)
  const [yMax, setYMax] = useState(10)
  const [axisStep, setAxisStep] = useState(2)
  const [equalAspect, setEqualAspect] = useState(false)

  const [problemText, setProblemText] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState<string>('image/png')
  const [isSolving, setIsSolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [graphSpec, setGraphSpec] = useState<GraphSpec>(() => ({
    title: 'y = sin(x) * x',
    xAxis: { min: -10, max: 10, step: 2, label: 'x' },
    yAxis: { min: -10, max: 10, step: 2, label: 'y' },
    equalAspect: false,
    functions: [{ expression: 'sin(x) * x', label: 'f(x) = sin(x) * x', color: FUNCTION_COLORS[0] }],
    shapes: [],
    points: [],
    solutionSteps: [],
  }))

  const { traces, evalError } = useMemo(() => buildPlotlyData(graphSpec), [graphSpec])
  const sampleTable = useMemo(() => buildSampleValueRows(graphSpec), [graphSpec])
  const displayError = error || evalError

  const syncBoundsFromSpec = (spec: GraphSpec) => {
    setXMin(spec.xAxis.min)
    setXMax(spec.xAxis.max)
    setYMin(spec.yAxis.min)
    setYMax(spec.yAxis.max)
    setAxisStep(spec.xAxis.step || 2)
    setEqualAspect(Boolean(spec.equalAspect))
  }

  const handleQuickPlot = () => {
    setError(null)
    if (!fullHeight) {
      const parsed = parseDeterministicGraphProblem(exprStr)
      if (!parsed || (parsed.functions.length === 0 && parsed.shapes.length === 0)) {
        setError('Enter an expression (e.g. x^2 - 4, 2*x + 1) or named points A(2,4), B(8,4).')
        return
      }
      setGraphSpec(parsed)
      return
    }

    const activeExprs = expressions.filter((e) => e.visible && e.expression.trim().length > 0)
    if (activeExprs.length === 0) {
      setError('Add or enable at least one visible expression to plot.')
      return
    }

    const safeXMin = Number.isFinite(xMin) ? xMin : -10
    const safeXMax = Number.isFinite(xMax) && xMax > safeXMin ? xMax : safeXMin + 10
    const safeYMin = Number.isFinite(yMin) ? yMin : -10
    const safeYMax = Number.isFinite(yMax) && yMax > safeYMin ? yMax : safeYMin + 10
    const safeStep = Number.isFinite(axisStep) && axisStep > 0 ? axisStep : 2

    const functionsList: GraphSpec['functions'] = []
    const shapesList: GraphSpec['shapes'] = []
    const pointsList: GraphSpec['points'] = []

    for (const entry of activeExprs) {
      const trimmed = entry.expression.trim()
      const parsed = parseDeterministicGraphProblem(trimmed)
      if (parsed && (parsed.shapes.length > 0 || parsed.points.length > 0)) {
        shapesList.push(...parsed.shapes)
        pointsList.push(...parsed.points)
      } else {
        const cleanExpr = trimmed.replace(/^[fy]\s*\(\s*x\s*\)\s*=\s*|^[y]\s*=\s*/i, '').trim()
        functionsList.push({
          expression: cleanExpr,
          label: `f(x) = ${cleanExpr}`,
          color: entry.color,
        })
      }
    }

    setGraphSpec({
      title: functionsList.map((f) => f.label).join(' | ') || 'Custom Plot',
      xAxis: { min: safeXMin, max: safeXMax, step: safeStep, label: 'x' },
      yAxis: { min: safeYMin, max: safeYMax, step: safeStep, label: 'y' },
      equalAspect,
      functions: functionsList,
      shapes: shapesList,
      points: pointsList,
      solutionSteps: [],
    })
  }

  const handleAddExpression = () => {
    const nextColor = FUNCTION_COLORS[expressions.length % FUNCTION_COLORS.length]
    setExpressions((prev) => [
      ...prev,
      { id: `expr-${Date.now()}`, expression: '', visible: true, color: nextColor },
    ])
  }

  const handleResetBounds = () => {
    setXMin(-10)
    setXMax(10)
    setYMin(-10)
    setYMax(10)
    setAxisStep(2)
    setEqualAspect(false)
    setGraphSpec((prev) => ({
      ...prev,
      xAxis: { min: -10, max: 10, step: 2, label: 'x' },
      yAxis: { min: -10, max: 10, step: 2, label: 'y' },
      equalAspect: false,
    }))
  }

  const handleImageFile = (file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is larger than 5 MB. Please upload a smaller screenshot.')
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

  const runGraphSolve = async (textOverride?: string) => {
    const queryText = (textOverride ?? problemText).trim()
    if (!queryText && !imagePreview) return
    if (textOverride !== undefined) {
      setProblemText(textOverride)
    }

    setIsSolving(true)
    setError(null)
    setCanvasTab('plot')

    // Instant client-side CAS & coordinate geometry path when text is deterministic
    if (!imagePreview && queryText) {
      const localSpec = parseDeterministicGraphProblem(queryText)
      if (
        localSpec &&
        (localSpec.functions.length > 0 ||
          localSpec.shapes.length > 0 ||
          localSpec.points.length > 0)
      ) {
        setGraphSpec(localSpec)
        syncBoundsFromSpec(localSpec)
        setIsSolving(false)
        return
      }
    }

    try {
      const res = await fetch('/api/ai/solve-graph', {
        method: 'POST',
        signal: AbortSignal.timeout(25000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: queryText || undefined,
          imageBase64: imagePreview || undefined,
          mimeType: imagePreview ? imageMime : undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.spec) {
        const nextSpec = data.spec as GraphSpec
        setGraphSpec(nextSpec)
        syncBoundsFromSpec(nextSpec)
        return
      }

      if (!imagePreview && queryText) {
        const offline = parseDeterministicGraphProblem(queryText)
        if (offline) {
          setGraphSpec(offline)
          syncBoundsFromSpec(offline)
          return
        }
      }

      setError(data?.error || 'Could not solve and plot this graph problem.')
    } catch {
      if (!imagePreview && queryText) {
        const offline = parseDeterministicGraphProblem(queryText)
        if (offline) {
          setGraphSpec(offline)
          syncBoundsFromSpec(offline)
          return
        }
      }
      setError('Network error while solving graph problem. Please retry.')
    } finally {
      setIsSolving(false)
    }
  }

  const hasSteps = graphSpec.solutionSteps && graphSpec.solutionSteps.length > 0

  // Compact layout when embedded inside Slide Viewer CalculatorPanel
  if (!fullHeight) {
    return (
      <div className="flex flex-col h-full bg-card gap-3 overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('solve')
                setError(null)
              }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                mode === 'solve'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Compass className="w-3.5 h-3.5 text-primary" />
              Solve Graph
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('quick')
                setError(null)
              }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                mode === 'quick'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FunctionSquare className="w-3.5 h-3.5 text-primary" />
              Quick f(x)
            </button>
          </div>
          {graphSpec.title ? (
            <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[48%]">
              {graphSpec.title}
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
          <div className="bg-muted/10 border border-border rounded-xl p-2 relative overflow-hidden min-h-[240px] flex-1">
            {displayError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-destructive/80 bg-destructive/5 z-20">
                <AlertCircle className="w-8 h-8 mb-2 opacity-60" />
                <p className="text-sm font-medium max-w-sm">{displayError}</p>
              </div>
            ) : null}
            <div className="w-full h-full relative z-10">
              <Plot
                data={traces}
                layout={{
                  autosize: true,
                  margin: { l: 42, r: 20, t: 24, b: 42 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  xaxis: {
                    title: { text: graphSpec.xAxis.label || 'x' },
                    range: [graphSpec.xAxis.min, graphSpec.xAxis.max],
                    dtick: graphSpec.xAxis.step,
                    gridcolor: 'rgba(128,128,128,0.16)',
                    zeroline: true,
                    zerolinewidth: 2,
                    zerolinecolor: 'rgba(128,128,128,0.55)',
                  },
                  yaxis: {
                    title: { text: graphSpec.yAxis.label || 'y' },
                    range: [graphSpec.yAxis.min, graphSpec.yAxis.max],
                    dtick: graphSpec.yAxis.step,
                    scaleanchor: graphSpec.equalAspect ? 'x' : undefined,
                    scaleratio: graphSpec.equalAspect ? 1 : undefined,
                    gridcolor: 'rgba(128,128,128,0.16)',
                    zeroline: true,
                    zerolinewidth: 2,
                    zerolinecolor: 'rgba(128,128,128,0.55)',
                  },
                  font: { color: 'var(--foreground)', size: 11 },
                  showlegend: traces.length > 1,
                  legend: { orientation: 'h', y: -0.18, font: { size: 10 } },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              />
            </div>
          </div>

          {hasSteps ? (
            <div className="bg-muted/25 border border-border rounded-xl p-3 overflow-y-auto max-h-[180px]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Verified Step-by-Step Solution
              </div>
              <div className="space-y-2 text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                {graphSpec.solutionSteps.map((step, i) => (
                  <div key={i} className="rounded-lg bg-background/60 border border-border/60 px-2.5 py-1.5">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {step}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {mode === 'quick' ? (
          <div className="flex-shrink-0 flex gap-2 items-center">
            <div className="flex-1 relative">
              <Input
                value={exprStr}
                onChange={(e) => setExprStr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickPlot()
                }}
                placeholder="e.g. x^2 - 4, 2*x + 1 or A(2,4), B(2,8)"
                className="pl-11 text-sm bg-muted/30 border-border"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-serif italic font-medium text-xs">
                f(x)=
              </span>
            </div>
            <Button onClick={handleQuickPlot} size="sm" className="bg-[#5B2D8E] hover:bg-[#492274] text-white cursor-pointer">
              Plot
            </Button>
          </div>
        ) : (
          <div className="flex-shrink-0 flex flex-col gap-2 bg-muted/20 border border-border rounded-xl p-2.5">
            {imagePreview ? (
              <div className="flex items-center justify-between gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Image src={imagePreview} alt="Graph question" width={32} height={32} unoptimized className="h-8 w-8 rounded object-cover border border-border" />
                  <span className="text-xs text-muted-foreground truncate">Question screenshot attached</span>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setImagePreview(null)} aria-label="Remove attached image">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : null}
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste a graph question or upload/paste a screenshot..."
              rows={2}
              className="w-full resize-none bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void runGraphSolve()
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
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
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs gap-1.5 cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5" />
                Upload Image
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void runGraphSolve()}
                disabled={isSolving || (!problemText.trim() && !imagePreview)}
                className="h-7 px-3 text-xs bg-[#5B2D8E] hover:bg-[#492274] text-white cursor-pointer"
              >
                {isSolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Solve & Plot'}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full Desmos x GeoGebra Split-Screen Workspace for /dashboard/calculator?tab=graph
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[620px]">
      {/* Left Sidebar: Problem / Expression Stack + Steps */}
      <div className="lg:col-span-5 flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('solve')
                setError(null)
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer',
                mode === 'solve'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Compass className="w-3.5 h-3.5 text-primary" />
              Solve Graph Problem
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('quick')
                setError(null)
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer',
                mode === 'quick'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FunctionSquare className="w-3.5 h-3.5 text-primary" />
              Expression Builder
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetBounds}
            title="Reset graph bounds"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>

        {mode === 'solve' ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-wider text-[11px] text-muted-foreground font-semibold">
                  Coordinate &amp; Graph Input
                </span>
                <span className="text-[11px] text-muted-foreground">Paste screenshot or question text</span>
              </div>

              {imagePreview ? (
                <div className="flex items-center justify-between gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Image
                      src={imagePreview}
                      alt="Graph question"
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 rounded object-cover border border-border"
                    />
                    <span className="text-xs text-muted-foreground truncate">Question screenshot attached</span>
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
              ) : null}

              <textarea
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste any coordinate geometry, transformation (translation, reflection, rotation), gradient, or function plotting question..."
                rows={4}
                className="w-full resize-none bg-background border border-border/80 rounded-lg p-2.5 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/70"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void runGraphSolve()
                  }
                }}
              />

              <div className="flex items-center justify-between gap-2">
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
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Upload Image
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void runGraphSolve()}
                  disabled={isSolving || (!problemText.trim() && !imagePreview)}
                  className="h-8 px-4 text-xs bg-[#5B2D8E] dark:bg-primary hover:bg-[#492274] text-white cursor-pointer"
                >
                  {isSolving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Solving &amp; Plotting...
                    </>
                  ) : (
                    'Solve & Plot'
                  )}
                </Button>
              </div>
            </div>

            {/* Domain Examples */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Try Exam &amp; Graph Templates
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GRAPH_EXAM_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => void runGraphSolve(preset.prompt)}
                    className="rounded-lg border border-border/80 bg-muted/30 hover:bg-muted/70 hover:border-primary/40 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Worked Solution Inspector */}
            <div className="flex-1 min-h-[200px] rounded-xl border border-border bg-muted/20 p-3.5 overflow-y-auto">
              {hasSteps ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Verified Step-by-Step Solution
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                    {graphSpec.solutionSteps.map((step, i) => (
                      <div key={i} className="rounded-lg bg-background border border-border/70 px-3 py-2">
                        <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                          Step {i + 1}
                        </div>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {step}
                        </ReactMarkdown>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 space-y-1.5 text-muted-foreground">
                  <Compass className="w-7 h-7 opacity-35" />
                  <p className="text-xs font-medium text-foreground">No worked steps loaded yet</p>
                  <p className="text-[11px] max-w-xs">
                    Select a template above or enter any transformation, gradient, or curve intersection problem to view step-by-step calculations alongside the plot.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Desmos-Style Multi-Expression Builder + Bounds */
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {expressions.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-2.5 py-2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpressions((prev) =>
                        prev.map((e) => (e.id === item.id ? { ...e, visible: !e.visible } : e))
                      )
                    }
                    title={item.visible ? 'Hide expression' : 'Show expression'}
                    className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-white cursor-pointer transition-opacity"
                    style={{ backgroundColor: item.visible ? item.color : '#64748b', opacity: item.visible ? 1 : 0.45 }}
                  >
                    {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>

                  <span className="font-serif italic text-xs text-muted-foreground shrink-0">
                    f{idx + 1}(x)=
                  </span>

                  <Input
                    value={item.expression}
                    onChange={(e) => {
                      const val = e.target.value
                      setExpressions((prev) =>
                        prev.map((row) => (row.id === item.id ? { ...row, expression: val } : row))
                      )
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickPlot()
                    }}
                    placeholder="e.g. x^2 - 4 or A(2,4), B(8,4)"
                    className="h-8 text-xs font-mono bg-background border-border/70 flex-1"
                  />

                  {expressions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setExpressions((prev) => prev.filter((row) => row.id !== item.id))}
                      aria-label="Remove expression"
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExpression}
                className="text-xs h-8 gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Expression
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleQuickPlot}
                className="flex-1 text-xs h-8 bg-[#5B2D8E] dark:bg-primary hover:bg-[#492274] text-white cursor-pointer"
              >
                Plot Expressions
              </Button>
            </div>

            {/* Quick Function Chips */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Quick Functions (updates active slot)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EXPR_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setExpressions((prev) => {
                        const next = [...prev]
                        next[0] = { ...next[0], expression: chip, visible: true }
                        return next
                      })
                    }}
                    className="rounded-md border border-border bg-background hover:border-primary/50 px-2 py-1 font-mono text-[11px] text-foreground transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport Bounds Controls */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5 mt-auto">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  Axes &amp; Scale Controls
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={equalAspect}
                    onChange={(e) => setEqualAspect(e.target.checked)}
                    className="accent-primary rounded cursor-pointer"
                  />
                  1:1 Equal Scale
                </label>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-muted-foreground mb-1">xMin</label>
                  <Input
                    type="number"
                    value={xMin}
                    onChange={(e) => setXMin(Number(e.target.value))}
                    className="h-7 text-xs font-mono px-2 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted-foreground mb-1">xMax</label>
                  <Input
                    type="number"
                    value={xMax}
                    onChange={(e) => setXMax(Number(e.target.value))}
                    className="h-7 text-xs font-mono px-2 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted-foreground mb-1">yMin</label>
                  <Input
                    type="number"
                    value={yMin}
                    onChange={(e) => setYMin(Number(e.target.value))}
                    className="h-7 text-xs font-mono px-2 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted-foreground mb-1">yMax</label>
                  <Input
                    type="number"
                    value={yMax}
                    onChange={(e) => setYMax(Number(e.target.value))}
                    className="h-7 text-xs font-mono px-2 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted-foreground mb-1">Step</label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={axisStep}
                    onChange={(e) => setAxisStep(Number(e.target.value))}
                    className="h-7 text-xs font-mono px-2 bg-background"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Canvas: Interactive Cartesian Plot & GeoGebra Objects / Value Table Inspector */}
      <div className="lg:col-span-7 flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-xs min-h-[520px]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3 mb-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground truncate">
              {graphSpec.title || 'Interactive Coordinate Sheet'}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground tabular-nums">
              x in [{graphSpec.xAxis.min}, {graphSpec.xAxis.max}] · y in [{graphSpec.yAxis.min}, {graphSpec.yAxis.max}] · step {graphSpec.xAxis.step}
              {graphSpec.equalAspect ? ' · 1:1 locked' : ''}
            </div>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCanvasTab('plot')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                canvasTab === 'plot'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Cartesian Canvas
            </button>
            <button
              type="button"
              onClick={() => setCanvasTab('inspector')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                canvasTab === 'inspector'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3 h-3" />
              Objects &amp; Table
            </button>
          </div>
        </div>

        {canvasTab === 'plot' ? (
          <div className="flex-1 relative rounded-xl border border-border/70 bg-muted/10 overflow-hidden min-h-[440px]">
            {displayError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-destructive/80 bg-destructive/5 z-20">
                <AlertCircle className="w-8 h-8 mb-2 opacity-60" />
                <p className="text-sm font-medium max-w-sm">{displayError}</p>
              </div>
            ) : null}

            <div className="w-full h-full relative z-10">
              <Plot
                data={traces}
                layout={{
                  autosize: true,
                  margin: { l: 48, r: 24, t: 28, b: 48 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  xaxis: {
                    title: { text: graphSpec.xAxis.label || 'x' },
                    range: [graphSpec.xAxis.min, graphSpec.xAxis.max],
                    dtick: graphSpec.xAxis.step,
                    gridcolor: 'rgba(128,128,128,0.18)',
                    zeroline: true,
                    zerolinewidth: 2,
                    zerolinecolor: 'rgba(128,128,128,0.6)',
                  },
                  yaxis: {
                    title: { text: graphSpec.yAxis.label || 'y' },
                    range: [graphSpec.yAxis.min, graphSpec.yAxis.max],
                    dtick: graphSpec.yAxis.step,
                    scaleanchor: graphSpec.equalAspect ? 'x' : undefined,
                    scaleratio: graphSpec.equalAspect ? 1 : undefined,
                    gridcolor: 'rgba(128,128,128,0.18)',
                    zeroline: true,
                    zerolinewidth: 2,
                    zerolinecolor: 'rgba(128,128,128,0.6)',
                  },
                  font: { color: 'var(--foreground)', size: 11 },
                  showlegend: traces.length > 0,
                  legend: {
                    orientation: 'h',
                    y: -0.15,
                    font: { size: 11 },
                  },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Value Table for Curves */}
            {sampleTable.columns.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-3.5 py-2 text-xs font-semibold text-foreground border-b border-border">
                  Function Value Table (Sample Points)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono tabular-nums">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-muted-foreground font-semibold">x</th>
                        {sampleTable.columns.map((col, idx) => (
                          <th key={idx} className="px-3 py-2 text-left font-semibold" style={{ color: col.color }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sampleTable.xs.map((xVal, rowIdx) => (
                        <tr key={xVal} className="hover:bg-muted/25">
                          <td className="px-3 py-1.5 font-semibold text-foreground">{xVal}</td>
                          {sampleTable.columns.map((col, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 text-muted-foreground">
                              {col.values[rowIdx]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Plotted Polygons, Shapes & Points */}
            {graphSpec.shapes.length > 0 || graphSpec.points.length > 0 ? (
              <div className="rounded-xl border border-border p-3.5 space-y-3">
                <div className="text-xs font-semibold text-foreground">Geometric Figures &amp; Coordinates</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {graphSpec.shapes.map((shape, idx) => (
                    <div key={idx} className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-1">
                      <div className="text-xs font-semibold text-foreground">{shape.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground flex flex-wrap gap-1.5">
                        {shape.vertices.map((v) => (
                          <span key={v.label} className="rounded bg-background border border-border/60 px-1.5 py-0.5">
                            {v.label}({v.x}, {v.y})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {graphSpec.points.length > 0 ? (
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-1">
                      <div className="text-xs font-semibold text-foreground">Standalone Points</div>
                      <div className="text-[11px] font-mono text-muted-foreground flex flex-wrap gap-1.5">
                        {graphSpec.points.map((pt) => (
                          <span key={pt.label} className="rounded bg-background border border-border/60 px-1.5 py-0.5">
                            {pt.label}({pt.x}, {pt.y})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {sampleTable.columns.length === 0 &&
            graphSpec.shapes.length === 0 &&
            graphSpec.points.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                Plot a function or solve a geometry problem to inspect coordinate tables and objects.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
