'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer, ArrowLeft, RefreshCw, Columns2, Columns3 } from 'lucide-react';
import { toast } from 'sonner';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import { cn } from '@/lib/utils';

export default function CheatSheetPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lectureId = params.lectureId as string;
  const cacheKey = `unistudy_cheatsheet_${lectureId}`;

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [colCount, setColCount] = useState<2 | 3>(3);
  const [cheatSheetData, setCheatSheetData] = useState<any>(null);

  const generateSheet = useCallback(
    async (forceFresh = false) => {
      if (!forceFresh && typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setCheatSheetData(JSON.parse(cached));
            setLoading(false);
            return;
          }
        } catch {}
      }

      if (forceFresh) setRegenerating(true);
      else setLoading(true);

      try {
        const slidesData = await apiFetch(`/lectures/${lectureId}/slides`);
        if (!slidesData || slidesData.length === 0) {
          toast.error('No slide text available to build a cheat sheet.');
          return;
        }

        const fullText = slidesData.map((s: any) => s.raw_text).join('\n\n');
        const res = await apiFetch('/ai/ask', {
          method: 'POST',
          body: JSON.stringify({
            feature: 'cheat_sheet',
            payload: { prompt: fullText, stream: false },
          }),
        });

        if (res.result) {
          setCheatSheetData(res.result);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(res.result));
            } catch {}
          }
          if (forceFresh) toast.success('Cheat sheet regenerated');
        }
      } catch {
        toast.error('Could not generate cheat sheet right now.');
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    },
    [cacheKey, lectureId]
  );

  useEffect(() => {
    void generateSheet(false);
  }, [generateSheet]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-8 w-2/3 mx-auto rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              courseId
                ? router.push(`/dashboard/courses/${courseId}/lectures/${lectureId}`)
                : router.back()
            }
            className="cursor-pointer"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Slides
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setColCount(2)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer',
                  colCount === 2
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Columns2 className="w-3.5 h-3.5" /> 2-Col
              </button>
              <button
                type="button"
                onClick={() => setColCount(3)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer',
                  colCount === 3
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Columns3 className="w-3.5 h-3.5" /> 3-Col
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={() => void generateSheet(true)}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', regenerating && 'animate-spin')} />
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>

            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] font-bold text-xs cursor-pointer"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print A4
            </Button>
          </div>
        </div>

        <div className="bg-white text-black p-5 sm:p-6 min-h-[29.7cm] w-full max-w-[21cm] mx-auto border border-border rounded-xl shadow-sm print:shadow-none print:border-none print:rounded-none">
          {cheatSheetData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#00004E] pb-2">
                <UniStudyLogo variant="primary" themeMode="light" height={24} />
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-600">
                  Condensed Exam Reference Sheet
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-center uppercase border-b border-slate-300 pb-2 text-[#00004E]">
                {cheatSheetData.title}
              </h1>

              <div
                className={cn(
                  'gap-4 text-[11px] leading-snug',
                  colCount === 2 ? 'columns-1 sm:columns-2' : 'columns-1 sm:columns-2 md:columns-3'
                )}
              >
                {cheatSheetData.columns?.map((col: any, idx: number) => (
                  <div key={idx} className="break-inside-avoid mb-4 border border-slate-200 rounded-md overflow-hidden">
                    <h2 className="font-bold bg-[#00004E] text-white px-2 py-1 uppercase text-[10px] tracking-wider">
                      {col.category}
                    </h2>
                    <ul className="p-2 space-y-1">
                      {col.items?.map((item: string, iIdx: number) => (
                        <li key={iIdx} className="flex items-start gap-1.5 text-slate-900">
                          <span className="text-[#D89A06] font-bold select-none">•</span>
                          <div className="flex-1 [&_p]:my-0">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {item}
                            </ReactMarkdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Could not load cheat sheet data. Click Regenerate above to retry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
