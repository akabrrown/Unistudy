'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { compile, range } from 'mathjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'

// Dynamic import of Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-muted/20 animate-pulse rounded-lg text-muted-foreground text-sm">Loading graph...</div>
})

export function GraphPlotter() {
  const [exprStr, setExprStr] = useState('sin(x) * x')
  const [plotExpr, setPlotExpr] = useState('sin(x) * x')
  const [error, setError] = useState<string | null>(null)

  const data = useMemo(() => {
    try {
      if (!plotExpr) return []
      const expr = compile(plotExpr)
      // Evaluate over range -10 to 10
      const xValues = range(-10, 10, 0.1).toArray() as number[]
      const yValues = xValues.map(x => expr.evaluate({ x }))
      setError(null)
      return [
        {
          x: xValues,
          y: yValues,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#8b5cf6', width: 2 },
          name: plotExpr
        }
      ]
    } catch (err: any) {
      setError(err.message || 'Invalid mathematical expression')
      return []
    }
  }, [plotExpr])

  return (
    <div className="flex flex-col h-full bg-card gap-4">
      <div className="flex-1 bg-muted/10 border border-border rounded-xl p-2 relative overflow-hidden min-h-[250px]">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-destructive/80 bg-destructive/5">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
          <div className="w-full h-full relative z-10">
            <Plot
              data={data as any}
              layout={{
                autosize: true,
                margin: { l: 40, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { gridcolor: 'rgba(128,128,128,0.1)', zerolinecolor: 'rgba(128,128,128,0.3)' },
                yaxis: { gridcolor: 'rgba(128,128,128,0.1)', zerolinecolor: 'rgba(128,128,128,0.3)' },
                font: { color: 'var(--foreground)' },
                showlegend: false
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
            />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex gap-2 items-center">
        <div className="flex-1 relative">
          <Input 
            value={exprStr}
            onChange={(e) => setExprStr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPlotExpr(exprStr)
              }
            }}
            placeholder="e.g. x^2, sin(x), exp(x)"
            className="pl-8 text-sm bg-muted/30 border-border"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-serif italic font-medium">f(x)=</span>
        </div>
        <Button 
          onClick={() => setPlotExpr(exprStr)}
          size="sm"
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          Plot
        </Button>
      </div>
    </div>
  )
}
