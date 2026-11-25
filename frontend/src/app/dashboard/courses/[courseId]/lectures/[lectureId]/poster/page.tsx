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
import { Printer, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import { cn } from '@/lib/utils';

export default function StudyPosterPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lectureId = params.lectureId as string;
  const cacheKey = `unistudy_poster_${lectureId}`;

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [posterData, setPosterData] = useState<any>(null);

  const generatePoster = useCallback(
    async (forceFresh = false) => {
      if (!forceFresh && typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setPosterData(JSON.parse(cached));
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
          toast.error('No slide text available to build a study poster.');
          return;
        }

        const fullText = slidesData.map((s: any) => s.raw_text).join('\n\n');
        const res = await apiFetch('/ai/ask', {
          method: 'POST',
          body: JSON.stringify({
            feature: 'study_poster',
            payload: { prompt: fullText, stream: false },
          }),
        });

        if (res.result) {
          setPosterData(res.result);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(res.result));
            } catch {}
          }
          if (forceFresh) toast.success('Study poster regenerated');
        }
      } catch {
        toast.error('Could not generate study poster right now.');
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    },
    [cacheKey, lectureId]
  );

  useEffect(() => {
    void generatePoster(false);
  }, [generatePoster]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <Skeleton className="h-10 w-3/4 mx-auto rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={() => void generatePoster(true)}
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

        <div className="bg-white text-black p-6 sm:p-8 rounded-xl shadow-md print:shadow-none print:p-0 min-h-[29.7cm] w-full max-w-[21cm] mx-auto border border-border print:border-none">
          {posterData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-[#00004E] pb-3">
                <UniStudyLogo variant="primary" themeMode="light" height={28} />
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-600">
                  Visual Lecture Summary Poster
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-center border-b-2 border-[#D89A06] pb-3 uppercase tracking-tight text-[#00004E]">
                {posterData.title}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-5">
                {posterData.sections?.map((section: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-50 p-5 rounded-xl border border-slate-300 border-t-4 border-t-[#00004E] break-inside-avoid"
                  >
                    <h2 className="text-base font-black mb-3 uppercase tracking-tight text-[#00004E]">
                      {section.heading}
                    </h2>
                    <ul className="space-y-2">
                      {section.points?.map((pt: string, pIdx: number) => (
                        <li key={pIdx} className="flex items-start gap-2 text-sm leading-snug text-slate-800">
                          <span className="text-[#D89A06] font-bold mt-0.5 select-none">•</span>
                          <div className="flex-1 [&_p]:my-0">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {pt}
                            </ReactMarkdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {posterData.keywords && posterData.keywords.length > 0 && (
                <div className="mt-6 p-4 bg-[#00004E] text-white rounded-xl text-center">
                  <p className="font-mono font-bold uppercase tracking-widest text-[11px] text-[#D89A06] mb-1.5">
                    Core Examination Terms
                  </p>
                  <p className="text-sm font-medium">{posterData.keywords.join(' · ')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Could not load study poster data. Click Regenerate above to retry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
