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
} from 'lucide-react'
import {
  parseDeterministicGraphProblem,
  type GraphSpec,
} from '../../../../shared/lib/graphSolver'

// Dynamic import of Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 animate-pulse rounded-lg text-muted-foreground text-sm">
      Loading interactive graph sheet...
    </div>
  ),
})

const FUNCTION_COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899']

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

export function GraphPlotter({ fullHeight = false }: { fullHeight?: boolean }) {
  const [mode, setMode] = useState<'solve' | 'quick'>('solve')
  const [exprStr, setExprStr] = useState('sin(x) * x')
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
    functions: [{ expression: 'sin(x) * x', label: 'f(x) = sin(x) * x' }],
    shapes: [],
    points: [],
    solutionSteps: [],
  }))

  const { traces, evalError } = useMemo(() => buildPlotlyData(graphSpec), [graphSpec])
  const displayError = error || evalError

  const handleQuickPlot = () => {
    setError(null)
    const parsed = parseDeterministicGraphProblem(exprStr)
    if (!parsed || (parsed.functions.length === 0 && parsed.shapes.length === 0)) {
      setError('Enter an expression (e.g. x^2 - 4, 2*x + 1) or named points A(2,4), B(8,4).')
      return
    }
    setGraphSpec(parsed)
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

  const handleSolveGraphProblem = async () => {
    if (!problemText.trim() && !imagePreview) return
    setIsSolving(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/solve-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problemText.trim() || undefined,
          imageBase64: imagePreview || undefined,
          mimeType: imagePreview ? imageMime : undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.spec) {
        setGraphSpec(data.spec as GraphSpec)
        return
      }

      // Offline / deterministic coordinate fallback when text-only
      if (!imagePreview && problemText.trim()) {
        const offline = parseDeterministicGraphProblem(problemText)
        if (offline) {
          setGraphSpec(offline)
          return
        }
      }

      setError(data?.error || 'Could not solve and plot this graph problem.')
    } catch {
      if (!imagePreview && problemText.trim()) {
        const offline = parseDeterministicGraphProblem(problemText)
        if (offline) {
          setGraphSpec(offline)
          return
        }
      }
      setError('Network error while solving graph problem. Please retry.')
    } finally {
      setIsSolving(false)
    }
  }

  const hasSteps = graphSpec.solutionSteps && graphSpec.solutionSteps.length > 0

  return (
    <div className="flex flex-col h-full bg-card gap-3 overflow-hidden">
      {/* Mode Switcher */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => {
              setMode('solve')
              setError(null)
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'solve'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-purple-500" />
            Solve Graph Problem
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('quick')
              setError(null)
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'quick'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FunctionSquare className="w-3.5 h-3.5 text-purple-500" />
            Quick f(x) Plot
          </button>
        </div>

        {graphSpec.title && (
          <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[55%]">
            {graphSpec.title}
          </span>
        )}
      </div>

      {/* Interactive Plot + Worked Steps */}
      <div
        className={`flex-1 min-h-0 flex ${
          fullHeight && hasSteps ? 'flex-col lg:flex-row gap-4' : 'flex-col gap-3'
        } overflow-y-auto`}
      >
        <div
          className={`bg-muted/10 border border-border rounded-xl p-2 relative overflow-hidden ${
            fullHeight
              ? hasSteps
                ? 'lg:flex-[3] min-h-[340px] lg:min-h-0'
                : 'flex-1 min-h-[360px]'
              : 'min-h-[240px] flex-1'
          }`}
        >
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
                legend: {
                  orientation: 'h',
                  y: -0.18,
                  font: { size: 10 },
                },
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
            />
          </div>
        </div>

        {hasSteps && (
          <div
            className={`bg-muted/25 border border-border rounded-xl p-3.5 overflow-y-auto ${
              fullHeight ? 'lg:flex-[2] max-h-[420px] lg:max-h-none' : 'max-h-[190px]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Verified Step-by-Step Solution
            </div>
            <div className="space-y-2 text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
              {graphSpec.solutionSteps.map((step, i) => (
                <div key={i} className="rounded-lg bg-background/60 border border-border/60 px-2.5 py-2">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {step}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
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
          <Button
            onClick={handleQuickPlot}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Plot
          </Button>
        </div>
      ) : (
        <div className="flex-shrink-0 flex flex-col gap-2 bg-muted/20 border border-border rounded-xl p-2.5">
          {imagePreview && (
            <div className="flex items-center justify-between gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src={imagePreview}
                  alt="Graph question"
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 rounded object-cover border border-border"
                />
                <span className="text-xs text-muted-foreground truncate">
                  Question screenshot attached
                </span>
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

          <textarea
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste a graph question (transformations, polygons, gradients, simultaneous equations) or upload/paste a screenshot..."
            rows={fullHeight ? 3 : 2}
            className="w-full resize-none bg-transparent text-xs sm:text-sm outline-none placeholder:text-muted-foreground/70"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSolveGraphProblem()
              }
            }}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
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
                className="h-7 text-xs gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload Question Image
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSolveGraphProblem}
              disabled={isSolving || (!problemText.trim() && !imagePreview)}
              className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSolving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Solving...
                </>
              ) : (
                'Solve & Plot'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
