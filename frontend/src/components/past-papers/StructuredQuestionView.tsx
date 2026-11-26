'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';

interface SubQuestionItem {
  label: string;
  text: string;
  marks?: string | null;
}

interface ParsedQuestion {
  preamble: string | null;
  subQuestions: SubQuestionItem[];
}

/**
 * Parses raw past paper question text, splitting crowded sub-questions (e.g. "a. ... [4 marks] b. ...")
 * into distinct, well-spaced structured sub-parts with dedicated label pills and mark badges.
 */
export function parseQuestionContent(
  rawContent: string,
  questionNumber?: string | number
): ParsedQuestion {
  if (!rawContent) {
    return { preamble: null, subQuestions: [] };
  }

  // 1. Normalize linebreaks and strip leading redundant "Question X" prefix
  let clean = rawContent.replace(/<br\s*\/?>/gi, '\n').trim();
  const qNumStr = questionNumber ? String(questionNumber) : '\\d+';
  const prefixRegex = new RegExp(`^(?:Question\\s*${qNumStr}|Q\\s*${qNumStr})[:.\\s-]*`, 'i');
  clean = clean.replace(prefixRegex, '').trim();

  // 2. Identify sub-question markers:
  // e.g., "a.", "b.", "c." OR "(a)", "(b)", "(c)" OR "i.", "ii.", "iii."
  const subPattern = /(?:^|\s+)(?:([a-g])\.\s+|\(([a-g])\)\s+|([ivx]+)\.\s+|\(([ivx]+)\)\s+)/gi;

  const matches: { index: number; length: number; label: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = subPattern.exec(clean)) !== null) {
    const label = (m[1] || m[2] || m[3] || m[4] || '').toLowerCase();
    matches.push({
      index: m.index,
      length: m[0].length,
      label,
    });
  }

  // If fewer than 2 markers found, it's not a multi-sub-question list
  if (matches.length === 0) {
    return { preamble: clean, subQuestions: [] };
  }

  // Preamble: text before the first sub-question marker
  const firstMatch = matches[0];
  const preambleText = clean.substring(0, firstMatch.index).trim();

  const subQuestions: SubQuestionItem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index + current.length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : clean.length;
    let text = clean.substring(startIndex, endIndex).trim();

    // Extract marks (e.g. "[4 marks]", "[3 Marks]", "(4 marks)", "[4 pts]")
    let marks: string | null = null;
    const marksMatch = text.match(/(?:\[|\()(\d+(?:\.\d+)?\s*(?:marks?|Marks?|pts?|points?))\s*(?:\]|\))\s*$/i);
    if (marksMatch) {
      marks = marksMatch[1];
      text = text.substring(0, marksMatch.index).trim();
    }

    subQuestions.push({
      label: current.label,
      text,
      marks,
    });
  }

  return {
    preamble: preambleText.length > 0 ? preambleText : null,
    subQuestions,
  };
}

interface StructuredQuestionViewProps {
  content: string;
  questionNumber?: string | number;
  className?: string;
}

export function StructuredQuestionView({
  content,
  questionNumber,
  className,
}: StructuredQuestionViewProps) {
  const { preamble, subQuestions } = useMemo(
    () => parseQuestionContent(content, questionNumber),
    [content, questionNumber]
  );

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* Question Preamble / Context (if present) */}
      {preamble && (
        <div className="text-sm text-foreground/90 prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
            {preamble}
          </ReactMarkdown>
        </div>
      )}

      {/* Structured Sub-Questions List */}
      {subQuestions.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {subQuestions.map((sub, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 dark:bg-muted/15 border border-border/70 hover:border-border transition-colors"
            >
              <span className="w-6 h-6 rounded-md bg-[#00004E]/10 dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] font-mono font-bold flex items-center justify-center shrink-0 text-xs border border-[#00004E]/15 dark:border-[#D89A06]/25 mt-0.5">
                {sub.label}
              </span>

              <div className="flex-1 text-sm text-foreground leading-relaxed min-w-0 prose prose-sm dark:prose-invert max-w-none [&_p]:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {sub.text}
                </ReactMarkdown>
              </div>

              {sub.marks && (
                <span className="shrink-0 px-2 py-0.5 rounded-md bg-background border border-border/80 text-[11px] font-mono font-semibold text-muted-foreground whitespace-nowrap shadow-2xs mt-0.5">
                  {sub.marks}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
