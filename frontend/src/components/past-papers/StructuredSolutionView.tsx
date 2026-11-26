'use client';

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Check, Copy, CheckCircle2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SolutionPart {
  label: string; // e.g. "Part (a)", "Part (b)", "Overview"
  content: string;
}

/**
 * Parses model answer text into structured sections.
 * Detects explicit headers (e.g. "### Part (a)") or implicit letter markers ("a. ... b. ...")
 * and splits them into clean, well-spaced visual blocks.
 */
function parseModelAnswer(raw: string): SolutionPart[] {
  if (!raw || !raw.trim()) return [];
  const text = raw.replace(/<br\s*\/?>/gi, '\n').trim();

  // 1. Check for markdown headings like "### Part (a)" or "### (a)" or "## Part a"
  const markdownHeadingPattern = /(?:^|\n)#{2,4}\s*(?:Part\s*)?\(?([a-g]|[ivx]+|\d+)\)?[:.\s-]*([\s\S]*?)(?=\n#{2,4}\s*(?:Part\s*)?\(?[a-g]|[ivx]+|\d+\)?|\s*$)/gi;
  const headingMatches: SolutionPart[] = [];
  let m: RegExpExecArray | null;

  while ((m = markdownHeadingPattern.exec(text)) !== null) {
    const rawLabel = m[1].toLowerCase();
    const headingRest = m[2] ? m[2].trim() : '';
    headingMatches.push({
      label: `Part (${rawLabel})`,
      content: headingRest,
    });
  }

  if (headingMatches.length >= 2) {
    return headingMatches;
  }

  // 2. Check for implicit sub-parts like "(a) ... (b) ..." or "a. ... b. ..." or "Part (a):"
  const implicitPattern = /(?:^|\n\n|\n)(?:Part\s*)?(?:\(([a-g])\)|([a-g])\.)\s+/gi;
  const positions: { index: number; label: string; length: number }[] = [];

  while ((m = implicitPattern.exec(text)) !== null) {
    const label = (m[1] || m[2] || '').toLowerCase();
    positions.push({
      index: m.index,
      label: `Part (${label})`,
      length: m[0].length,
    });
  }

  if (positions.length >= 2) {
    const parts: SolutionPart[] = [];
    const preamble = text.substring(0, positions[0].index).trim();
    if (preamble.length > 0) {
      parts.push({
        label: 'Introduction / Context',
        content: preamble,
      });
    }

    for (let i = 0; i < positions.length; i++) {
      const current = positions[i];
      const start = current.index + current.length;
      const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
      const content = text.substring(start, end).trim();
      parts.push({
        label: current.label,
        content,
      });
    }
    return parts;
  }

  // Fallback: single complete solution
  return [
    {
      label: 'Complete Worked Solution',
      content: text,
    },
  ];
}

interface StructuredSolutionViewProps {
  modelAnswer: string;
  className?: string;
}

export function StructuredSolutionView({ modelAnswer, className }: StructuredSolutionViewProps) {
  const parts = useMemo(() => parseModelAnswer(modelAnswer), [modelAnswer]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyPart = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // copy fallback
    }
  };

  if (!modelAnswer || !modelAnswer.trim()) {
    return (
      <div className="p-4 text-xs italic text-muted-foreground bg-muted/20 rounded-xl border border-border">
        No official model solution has been generated for this question yet.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4 pt-1', className)}>
      {parts.map((part, idx) => {
        const isMulti = parts.length > 1;

        return (
          <div
            key={idx}
            className={cn(
              'rounded-xl border transition-all overflow-hidden',
              isMulti
                ? 'bg-background/80 dark:bg-muted/10 border-border/80 shadow-2xs'
                : 'bg-transparent border-transparent'
            )}
          >
            {isMulti && (
              <div className="px-3.5 py-2.5 bg-emerald-500/10 dark:bg-emerald-500/15 border-b border-emerald-500/20 flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {part.label}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyPart(part.content, idx)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-muted-foreground hover:text-foreground cursor-pointer px-2 py-0.5 rounded hover:bg-muted/50 transition-colors"
                  title="Copy this solution part"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Part
                    </>
                  )}
                </button>
              </div>
            )}

            <div
              className={cn(
                'text-sm text-foreground/95 leading-relaxed prose prose-sm dark:prose-invert max-w-none',
                isMulti ? 'p-4' : 'p-1',
                // Custom code block styling with dark contrast and clean spacing
                '[&_pre]:bg-slate-950 [&_pre]:text-slate-100 [&_pre]:border [&_pre]:border-slate-800 [&_pre]:rounded-xl [&_pre]:p-3.5 [&_pre]:text-xs [&_pre]:font-mono [&_pre]:overflow-x-auto',
                '[&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded',
                '[&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2'
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {part.content}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}
