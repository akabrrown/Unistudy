'use client'

import React, { useState } from 'react'
import { Sparkles, Copy, Check, Volume2, VolumeX, StickyNote, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

interface TutorFeedbackViewProps {
  messages: ChatMessage[]
  isLoading: boolean
  tutorName?: string
  onSendSuggestion?: (suggestionText: string) => void
  onSaveToNotes?: (content: string) => void
}

export function TutorFeedbackView({
  messages,
  isLoading,
  tutorName = 'AI Tutor',
  onSendSuggestion,
  onSaveToNotes
}: TutorFeedbackViewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    toast.success('Copied tutor feedback to clipboard!')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleSpeak = (text: string, index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.')
      return
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel()
      setSpeakingIndex(null)
      return
    }

    window.speechSynthesis.cancel()
    // Clean markdown symbols for cleaner audio narration
    const cleanSpeech = text
      .replace(/<[^>]*>?/gm, '')
      .replace(/\[\^.*?\]/g, '')
      .replace(/[`#*_~$\\]/g, '')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanSpeech)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onend = () => setSpeakingIndex(null)
    utterance.onerror = () => setSpeakingIndex(null)

    setSpeakingIndex(index)
    window.speechSynthesis.speak(utterance)
  }

  const quickSuggestions = [
    { label: 'Give an Analogy', prompt: 'Can you explain this with a memorable, real-world analogy?' },
    { label: 'Practice Question', prompt: 'Can you test me with a quick exam-style practice question on this concept?' },
    { label: 'Step-by-Step Breakdown', prompt: 'Can you break this down into clear, numbered step-by-step points?' },
    { label: 'Key Summary', prompt: 'Can you summarize the most critical takeaways into 3 concise bullet points?' }
  ]

  return (
    <div className="space-y-4">
      {messages.map((msg, i) => {
        const isUser = msg.role === 'user'

        if (isUser) {
          return (
            <div key={i} className="flex justify-end pl-6">
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-sm">
                <p className="whitespace-pre-wrap leading-relaxed font-normal">{msg.content}</p>
              </div>
            </div>
          )
        }

        // Assistant (Tutor) Enriched View
        return (
          <div key={i} className="flex justify-start pr-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-full rounded-2xl border border-emerald-500/25 bg-card/95 shadow-md shadow-emerald-500/5 overflow-hidden transition-all hover:border-emerald-500/40">
              {/* Tutor Header Card Banner */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/30 shadow-xs">
                    <Sparkles size={14} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs tracking-tight text-foreground flex items-center gap-1.5">
                      {tutorName}
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Tutor Insight
                      </span>
                    </span>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleSpeak(msg.content, i)}
                    title={speakingIndex === i ? 'Stop listening' : 'Listen to explanation'}
                    className={speakingIndex === i ? 'text-emerald-600 bg-emerald-500/20 animate-pulse' : 'text-muted-foreground hover:text-foreground'}
                  >
                    {speakingIndex === i ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleCopy(msg.content, i)}
                    title="Copy answer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copiedIndex === i ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </Button>
                  {onSaveToNotes && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onSaveToNotes(msg.content)}
                      title="Save answer to slide notes"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <StickyNote size={13} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Enriched Content Body */}
              <div className="p-4 text-sm leading-relaxed text-foreground select-text">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    h1: (props) => (
                      <h1 className="text-base font-bold text-foreground mt-3 mb-1.5 border-b border-border/60 pb-1" {...props} />
                    ),
                    h2: (props) => (
                      <h2 className="text-sm font-bold mt-3 mb-1.5 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400" {...props} />
                    ),
                    h3: (props) => (
                      <h3 className="text-xs uppercase tracking-wider font-bold text-foreground/90 mt-2.5 mb-1" {...props} />
                    ),
                    p: (props) => (
                      <p className="text-sm leading-relaxed text-foreground/90 my-2" {...props} />
                    ),
                    ul: (props) => (
                      <ul className="my-2 space-y-1.5 list-disc pl-5 text-sm text-foreground/90" {...props} />
                    ),
                    ol: (props) => (
                      <ol className="my-2 space-y-1.5 list-decimal pl-5 text-sm text-foreground/90 font-medium" {...props} />
                    ),
                    li: (props) => (
                      <li className="leading-relaxed pl-1" {...props} />
                    ),
                    blockquote: ({ children, ...props }) => (
                      <blockquote className="my-3 border-l-4 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-r-xl px-3.5 py-2 text-sm text-foreground shadow-xs" {...props}>
                        <div className="font-medium text-foreground">
                          {children}
                        </div>
                      </blockquote>
                    ),
                    strong: (props) => (
                      <strong className="font-semibold text-emerald-900 dark:text-emerald-200" {...props} />
                    ),
                    pre: ({ children }) => <>{children}</>,
                    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
                      const match = /language-(\w+)/.exec(className || '')
                      const textContent = String(children).replace(/\n$/, '')
                      const isBlock = Boolean(match || String(children).includes('\n'))
                      if (isBlock) {
                        return (
                          <div className="my-3 rounded-xl overflow-hidden border border-border bg-slate-950 text-slate-100 shadow-sm text-xs font-mono">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
                              <span className="uppercase text-[10px] tracking-wider font-semibold">{match?.[1] || 'code'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(textContent)
                                  toast.success('Code copied!')
                                }}
                                className="hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                              >
                                <Copy size={11} /> Copy Code
                              </button>
                            </div>
                            <pre className="p-3 overflow-x-auto leading-relaxed">
                              <code>{textContent}</code>
                            </pre>
                          </div>
                        )
                      }
                      return (
                        <code className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono text-xs font-semibold border border-emerald-500/20" {...props}>
                          {children}
                        </code>
                      )
                    },
                    table: (props) => (
                      <div className="my-3 overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs text-left border-collapse" {...props} />
                      </div>
                    ),
                    th: (props) => (
                      <th className="bg-muted px-3 py-2 font-semibold text-foreground border-b border-border" {...props} />
                    ),
                    td: (props) => (
                      <td className="px-3 py-2 border-b border-border/50 bg-card/40" {...props} />
                    )
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )
      })}

      {/* Suggested Follow-Up Prompts */}
      {messages.length > 0 && !isLoading && onSendSuggestion && (
        <div className="pt-2 pb-1 border-t border-border/40">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles size={11} className="text-emerald-500" /> Explore Further
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendSuggestion(s.prompt)}
                className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition-all flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{s.label}</span>
                <ArrowRight size={10} className="opacity-70" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
