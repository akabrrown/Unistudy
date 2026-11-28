'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  FileText,
  Layers,
  FileCheck2,
  Search,
  RotateCcw,
  ArrowRight,
  BrainCircuit,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import { CollegiateLibraryIllustration } from '@/components/illustrations';
import { SPRING_SNAPPY, useAppReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

type SearchCategoryTab = 'all' | 'slides' | 'flashcards' | 'papers';

interface SlideHit {
  id: string;
  lecture_id: string;
  course_id?: string | null;
  slide_number: number;
  text_content?: string | null;
  explanation?: string | null;
  image_url?: string | null;
}

interface FlashcardHit {
  id: string;
  lecture_id?: string | null;
  course_id?: string | null;
  front: string;
  back: string;
}

interface PaperHit {
  id: string;
  past_paper_id: string;
  course_id?: string | null;
  text_content?: string | null;
}

interface SearchPayload {
  slides?: SlideHit[];
  flashcards?: FlashcardHit[];
  past_papers?: PaperHit[];
}

function highlightQuery(text: string | null | undefined, query: string): React.ReactNode {
  if (!text) return null;
  const trimmed = query.trim();
  if (trimmed.length < 2) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark
        key={idx}
        className="bg-[#D89A06]/25 text-foreground rounded-xs px-0.5 font-semibold"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reducedMotion = useAppReducedMotion();

  const urlQuery = searchParams.get('q') || '';
  const [draftQuery, setDraftQuery] = useState(urlQuery);
  const [activeCategory, setActiveCategory] = useState<SearchCategoryTab>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchPayload | null>(null);
  const [error, setError] = useState('');
  const [lectureCourseMap, setLectureCourseMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setDraftQuery(urlQuery);
  }, [urlQuery]);

  // Build lectureId -> courseId map and track active course IDs so results from archived courses are hidden
  const [activeCourseIds, setActiveCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetch('/api/courses')
      .then((r) => (r.ok ? r.json() : []))
      .then((courses: Array<{ id: string; lectures?: Array<{ id: string }> }>) => {
        if (!active || !Array.isArray(courses)) return;
        const map = new Map<string, string>();
        const courseIdSet = new Set<string>();
        for (const c of courses) {
          if (c.id) courseIdSet.add(c.id);
          for (const lec of c.lectures || []) {
            if (lec?.id && c.id) map.set(lec.id, c.id);
          }
        }
        setLectureCourseMap(map);
        setActiveCourseIds(courseIdSet);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const executeSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = (await apiFetch('/search', {
        method: 'POST',
        body: JSON.stringify({ query: trimmed }),
      })) as { data?: SearchPayload } & SearchPayload;

      const payload: SearchPayload = response?.data ? response.data : response;
      setResults({
        slides: Array.isArray(payload?.slides) ? payload.slides : [],
        flashcards: Array.isArray(payload?.flashcards) ? payload.flashcards : [],
        past_papers: Array.isArray(payload?.past_papers) ? payload.past_papers : [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not complete search');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlQuery.trim()) {
      void executeSearch(urlQuery);
    } else {
      setResults(null);
    }
  }, [urlQuery, executeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draftQuery.trim();
    if (!q) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(q)}`);
  };

  const rawSlides = results?.slides || [];
  const rawFlashcards = results?.flashcards || [];
  const rawPapers = results?.past_papers || [];

  // Hide slides, flashcards, and past papers linked to archived courses
  const slides = useMemo(() => {
    if (activeCourseIds.size === 0) return rawSlides;
    return rawSlides.filter((s) => {
      const cId = s.course_id || (s.lecture_id ? lectureCourseMap.get(s.lecture_id) : undefined);
      return !cId || activeCourseIds.has(cId);
    });
  }, [rawSlides, activeCourseIds, lectureCourseMap]);

  const flashcards = useMemo(() => {
    if (activeCourseIds.size === 0) return rawFlashcards;
    return rawFlashcards.filter((f) => {
      const cId = f.course_id || (f.lecture_id ? lectureCourseMap.get(f.lecture_id) : undefined);
      return !cId || activeCourseIds.has(cId);
    });
  }, [rawFlashcards, activeCourseIds, lectureCourseMap]);

  const papers = useMemo(() => {
    if (activeCourseIds.size === 0) return rawPapers;
    return rawPapers.filter((p) => {
      const cId = p.course_id;
      return !cId || activeCourseIds.has(cId);
    });
  }, [rawPapers, activeCourseIds]);

  const totalCount = slides.length + flashcards.length + papers.length;

  const tabs: Array<{ id: SearchCategoryTab; label: string; count: number }> = useMemo(
    () => [
      { id: 'all', label: 'All Results', count: totalCount },
      { id: 'slides', label: 'Lecture Slides', count: slides.length },
      { id: 'flashcards', label: 'Flashcards', count: flashcards.length },
      { id: 'papers', label: 'Past Papers', count: papers.length },
    ],
    [totalCount, slides.length, flashcards.length, papers.length]
  );

  const resolveSlideHref = (s: SlideHit) => {
    const courseId = s.course_id || lectureCourseMap.get(s.lecture_id);
    if (courseId) {
      return `/dashboard/courses/${courseId}/lectures/${s.lecture_id}?slide=${s.slide_number}`;
    }
    return `/dashboard/lectures/${s.lecture_id}?slide=${s.slide_number}`;
  };

  const resolveFlashcardHref = (f: FlashcardHit) => {
    const courseId = f.course_id || (f.lecture_id ? lectureCourseMap.get(f.lecture_id) : undefined);
    if (courseId) {
      return `/dashboard/courses/${courseId}/flashcards`;
    }
    return '/dashboard/courses';
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      {/* Live Hero Search Bar */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Search Study Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Find formulas, definitions, and exam questions across your lecture slides, flashcards, and past papers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Search concepts, course codes, or formulas (e.g. IAS 2 inventory, eigenvalues)..."
              className="pl-10 h-11 rounded-xl bg-background border-border/80 text-sm focus:border-[#D89A06]"
              autoFocus={!urlQuery}
            />
          </div>
          <Button
            type="submit"
            disabled={!draftQuery.trim() || loading}
            className="h-11 px-5 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] font-bold text-xs sm:text-sm cursor-pointer shrink-0"
          >
            Search
          </Button>
        </form>

        {results && urlQuery && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
            <div className="inline-flex flex-wrap rounded-xl border border-border bg-muted/35 p-1 gap-1">
              {tabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={cn(
                      'relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums',
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="search-category-pill"
                        transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                        className="absolute inset-0 rounded-lg bg-background shadow-xs"
                      />
                    )}
                    <span className="relative z-10">
                      {tab.label} ({tab.count})
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'match' : 'matches'} for &ldquo;{urlQuery}&rdquo;
            </span>
          </div>
        )}
      </header>

      {/* Empty Query State */}
      {!urlQuery.trim() ? (
        <div className="rounded-2xl border border-border/70 bg-card p-10 text-center flex flex-col items-center space-y-4">
          <CollegiateLibraryIllustration className="w-52 h-36" />
          <div className="space-y-1 max-w-md">
            <h2 className="text-base font-bold text-foreground">Search across every course</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter any topic, theorem, or exam keyword above to jump straight to the matching slide, flashcard, or past question.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 bg-destructive/10 border border-destructive/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-destructive">Search unavailable</p>
            <p className="text-xs text-destructive/90 mt-0.5">{error}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void executeSearch(urlQuery)}
            className="shrink-0 gap-1.5 text-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </Button>
        </div>
      ) : results && totalCount === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-10 text-center flex flex-col items-center space-y-3">
          <CollegiateLibraryIllustration className="w-48 h-32" />
          <h3 className="text-base font-bold text-foreground">
            No matches for &ldquo;{urlQuery}&rdquo;
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Try shorter keywords, a course code, or ask your Study Tutor directly.
          </p>
          <Link
            href={`/dashboard/chat`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] hover:underline pt-1"
          >
            Ask Study Tutor instead <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : results ? (
        <div className="space-y-8">
          {/* Slides */}
          {(activeCategory === 'all' || activeCategory === 'slides') && slides.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
                <span>Lecture Slides</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  ({slides.length})
                </span>
              </h2>
              <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                {slides.map((s) => (
                  <Link
                    href={resolveSlideHref(s)}
                    key={s.id}
                    className="group bg-card border border-border/80 hover:border-[#00004E]/50 dark:hover:border-[#D89A06]/60 rounded-2xl p-4 transition-all flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[#00004E] dark:text-[#D89A06] tabular-nums">
                          Slide {s.slide_number}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs sm:text-sm text-foreground line-clamp-3 font-medium leading-relaxed">
                        {highlightQuery(s.text_content, urlQuery)}
                      </p>
                    </div>
                    {s.explanation && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t border-border/40">
                        {highlightQuery(s.explanation, urlQuery)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Flashcards */}
          {(activeCategory === 'all' || activeCategory === 'flashcards') &&
            flashcards.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
                  <span>Flashcards</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    ({flashcards.length})
                  </span>
                </h2>
                <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {flashcards.map((f) => (
                    <Link
                      href={resolveFlashcardHref(f)}
                      key={f.id}
                      className="group bg-card border border-border/80 hover:border-[#00004E]/50 dark:hover:border-[#D89A06]/60 rounded-2xl p-4 transition-all flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Question
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2">
                          {highlightQuery(f.front, urlQuery)}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-border/40 space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Answer
                        </span>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {highlightQuery(f.back, urlQuery)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          {/* Past Papers */}
          {(activeCategory === 'all' || activeCategory === 'papers') && papers.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Past Papers</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  ({papers.length})
                </span>
              </h2>
              <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                {papers.map((p) => (
                  <Link
                    href={`/dashboard/past-papers/${p.past_paper_id}`}
                    key={p.id}
                    className="group bg-card border border-border/80 hover:border-[#00004E]/50 dark:hover:border-[#D89A06]/60 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-[#D89A06]" />
                        Exam Question
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-4 leading-relaxed">
                      {highlightQuery(p.text_content, urlQuery)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
