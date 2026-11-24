'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  BookOpen,
  Clock,
  ArrowRight,
  Trash2,
  Search,
  FolderOpen,
  Upload,
  CheckCircle2,
  GraduationCap,
  Layers,
  Award,
  TrendingUp,
  Play,
  FileText,
  LayoutGrid,
  List,
  DownloadCloud,
  Loader2,
  Target,
  FolderInput,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api/client';
import { resolveCourseColor } from '@/lib/constants/courses';
import { UploadModal } from '@/components/past-papers/UploadModal';
import { MoodleSyncModal } from '@/components/past-papers/MoodleSyncModal';
import { ExamFocusDialog } from '@/components/exam-focus/ExamFocusDialog';
import { MovePaperDialog } from '@/components/past-papers/MovePaperDialog';
import { ExamArchiveIllustration } from '@/components/illustrations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { normalizePastPaperTitle, resolveDisplayCourseCode } from '@/lib/past-papers/titleNormalizer';

interface CourseItem {
  id: string;
  course_code: string | null;
  title: string;
  semester?: number | string | null;
  year?: number | null;
  colour?: string | null;
  past_papers?: PastPaperRecord[];
}

interface PastPaperCourseJoin {
  id?: string;
  course_code?: string | null;
  title?: string | null;
  colour?: string | null;
  isCentral?: boolean;
}

interface PastPaperRecord {
  id: string;
  course_id: string | null;
  course_code?: string | null;
  normalized_course_code?: string | null;
  institution_id?: string | null;
  title: string | null;
  year: number | null;
  exam_type: string | null;
  status: string | null;
  created_at: string;
  courses?: PastPaperCourseJoin | PastPaperCourseJoin[] | null;
  source?: string | null;
  download_url?: string | null;
  question_count?: number;
}

interface AttemptPaperJoin {
  id?: string;
  title?: string | null;
  year?: number | null;
  course_id?: string | null;
}

interface PastPaperAttemptRecord {
  id: string;
  past_paper_id: string | null;
  score_percentage: number | null;
  started_at: string | null;
  completed_at: string | null;
  past_papers?: AttemptPaperJoin | AttemptPaperJoin[] | null;
}

type ExamTypeFilter = 'all' | 'final' | 'mid-semester' | 'resit';
type AttemptStatusFilter = 'all' | 'attempted' | 'unattempted' | 'processing';

function resolveExamLabel(examType: string | null | undefined): string {
  if (examType === 'mid-semester') return 'Midterm Exam';
  if (examType === 'resit') return 'Resit Exam';
  return 'Final Exam';
}

export function matchesCourse(paper: PastPaperRecord, course: CourseItem): boolean {
  if (paper.course_id && paper.course_id === course.id) return true;
  const cId = Array.isArray(paper.courses) ? paper.courses[0]?.id : paper.courses?.id;
  const isCentral = Array.isArray(paper.courses) ? false : Boolean((paper.courses as any)?.isCentral);
  if (cId && !isCentral && cId === course.id) return true;
  const pCode = (paper.normalized_course_code || paper.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cCode = (course.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!pCode || !cCode) return false;
  return pCode === cCode;
}

function getCourseJoin(paper: PastPaperRecord): PastPaperCourseJoin | null {
  if (!paper.courses) return null;
  return Array.isArray(paper.courses) ? paper.courses[0] || null : paper.courses;
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return 'Recent';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PastPapersDashboard() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [papers, setPapers] = useState<PastPaperRecord[]>([]);
  const [attempts, setAttempts] = useState<PastPaperAttemptRecord[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMoodleModalOpen, setIsMoodleModalOpen] = useState(false);
  const [preselectedCourseId, setPreselectedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExamFocusOpen, setIsExamFocusOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [globalPapers, setGlobalPapers] = useState<PastPaperRecord[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [paperToMove, setPaperToMove] = useState<PastPaperRecord | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string | null>(null);
  const [examTypeFilter, setExamTypeFilter] = useState<ExamTypeFilter>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AttemptStatusFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadParam = searchParams.get('action');
  const [dismissedUploadAction, setDismissedUploadAction] = useState(false);
  const effectiveUploadOpen = isUploadModalOpen || (uploadParam === 'upload' && !dismissedUploadAction);

  const [dismissedExamAreasAction, setDismissedExamAreasAction] = useState(false);
  const isExamAreasAction = uploadParam === 'exam-areas' || uploadParam === 'exam-focus';
  const effectiveExamFocusOpen = isExamFocusOpen || (isExamAreasAction && !dismissedExamAreasAction);
  const handleExamFocusOpenChange = (open: boolean) => {
    setIsExamFocusOpen(open);
    if (!open && isExamAreasAction) {
      setDismissedExamAreasAction(true);
      router.replace('/dashboard/past-papers');
    } else if (open) {
      setDismissedExamAreasAction(false);
    }
  };

  const fetchDashboardState = async (): Promise<{
    nextCourses: CourseItem[];
    nextPapers: PastPaperRecord[];
    nextAttempts: PastPaperAttemptRecord[];
  }> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { nextCourses: [], nextPapers: [], nextAttempts: [] };
    }

    const [coursesRes, papersRes, attemptsRes] = await Promise.allSettled([
      fetch('/api/courses')
        .then((r) => (r.ok ? r.json() : apiFetch('/courses')))
        .catch(() => apiFetch('/courses'))
        .catch(() => []),
      fetch('/api/v1/past-questions')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => apiFetch('/v1/past-questions'))
        .catch(() => []),
      supabase
        .from('past_paper_attempts')
        .select(
          'id, past_paper_id, score_percentage, started_at, completed_at, past_papers!past_paper_attempts_past_paper_id_fkey(id, title, year, course_id)'
        )
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(30),
    ]);

    const nextCourses =
      coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value)
        ? (coursesRes.value as CourseItem[])
        : [];
    const rawPapers =
      papersRes.status === 'fulfilled' && Array.isArray(papersRes.value)
        ? (papersRes.value as PastPaperRecord[])
        : papersRes.status === 'fulfilled' && Array.isArray((papersRes.value as any)?.data)
        ? ((papersRes.value as any).data as PastPaperRecord[])
        : [];

    // Display papers strictly related to courses created on the user's system
    const userCourseIdSet = new Set(nextCourses.map((c) => c.id));
    const userCourseCodes = nextCourses
      .map((c) => (c.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter(Boolean);

    const nextPapers = rawPapers.filter((p) => {
      // 1. Direct course ID match
      if (p.course_id && userCourseIdSet.has(p.course_id)) return true;
      const cId = Array.isArray(p.courses) ? p.courses[0]?.id : p.courses?.id;
      if (cId && userCourseIdSet.has(cId)) return true;

      // 2. Strict match by course code (exact normalized code match)
      const pCode = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (pCode && userCourseCodes.some((cCode) => pCode === cCode)) return true;

      // 3. Central bank papers with no assigned course (available in global repository)
      const isCentral = Array.isArray(p.courses) ? false : Boolean((p.courses as any)?.isCentral);
      if (isCentral || !p.course_id) return true;

      return false;
    });

    // Enforce strict deduplication per course across title, academic year, and exam type
    const dedupedPapersMap = new Map<string, PastPaperRecord>();
    for (const p of nextPapers) {
      const pCode = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${pCode}_${p.year}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
      if (!dedupedPapersMap.has(dedupKey) && !dedupedPapersMap.has(p.id)) {
        dedupedPapersMap.set(dedupKey, p);
        dedupedPapersMap.set(p.id, p);
      }
    }
    const finalPapers = Array.from(new Set(dedupedPapersMap.values()));

    const nextAttempts =
      attemptsRes.status === 'fulfilled' && Array.isArray(attemptsRes.value.data)
        ? (attemptsRes.value.data as PastPaperAttemptRecord[])
        : [];

    return { nextCourses, nextPapers: finalPapers, nextAttempts };
  };

  const loadData = async () => {
    try {
      const { nextCourses, nextPapers, nextAttempts } = await fetchDashboardState();
      setCourses(nextCourses);
      setPapers(nextPapers);
      setAttempts(nextAttempts);
    } catch (err) {
      console.error('Error loading past papers dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const { nextCourses, nextPapers, nextAttempts } = await fetchDashboardState();
        if (!active) return;
        setCourses(nextCourses);
        setPapers(nextPapers);
        setAttempts(nextAttempts);
      } catch (err) {
        console.error('Error loading past papers dashboard data:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();

    // Live real-time Supabase subscription for instant past questions updates
    const channel = supabase
      .channel('realtime:past_papers_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'past_papers' }, () => {
        void loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'past_paper_attempts' }, () => {
        void loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global search effect: queries the university past questions repository for any matching papers
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setGlobalPapers([]);
      setIsSearchingGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const res = await fetch(`/api/v1/past-questions?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setGlobalPapers(data);
          }
        }
      } catch (err) {
        console.warn('[Global search error]', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenUpload = (courseId?: string) => {
    setPreselectedCourseId(courseId || null);
    setIsUploadModalOpen(true);
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPapers((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleDelete = async (e: React.MouseEvent | null, ids: string[]) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!ids || ids.length === 0) return;
    const msg =
      ids.length === 1
        ? 'Are you sure you want to delete this past question paper? All extracted questions and drill data will be permanently removed.'
        : `Are you sure you want to delete ${ids.length} past question paper(s)?`;
    if (!confirm(msg)) return;

    const previousPapers = [...papers];
    setPapers((prev) => prev.filter((p) => !ids.includes(p.id)));
    setSelectedPapers((prev) => prev.filter((p) => !ids.includes(p)));
    setIsDeleting(true);

    try {
      if (ids.length === 1) {
        await apiFetch(`/past-papers/${ids[0]}`, { method: 'DELETE' });
      } else {
        await apiFetch('/past-papers/delete-batch', {
          method: 'POST',
          body: JSON.stringify({ ids }),
        });
      }
      toast.success(ids.length === 1 ? 'Past paper deleted' : `${ids.length} past papers deleted`);
    } catch (err: unknown) {
      const apiMsg = err instanceof Error ? err.message : '';
      console.warn('Backend delete error, trying direct Supabase fallback:', apiMsg);
      try {
        const { error: supaErr } = await supabase.from('past_papers').delete().in('id', ids);
        if (supaErr) throw supaErr;
        toast.success(ids.length === 1 ? 'Past paper deleted' : `${ids.length} past papers deleted`);
      } catch (fallbackErr: unknown) {
        setPapers(previousPapers);
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : apiMsg;
        toast.error(fallbackMsg || 'Failed to delete past paper');
      }
    } finally {
      setIsDeleting(false);
      void loadData();
    }
  };

  // Map best & latest attempt per paper_id
  const attemptsByPaper = useMemo(() => {
    const map = new Map<
      string,
      { count: number; bestScore: number | null; latestAttemptId: string; latestScore: number | null }
    >();
    for (const att of attempts) {
      if (!att.past_paper_id) continue;
      const scoreNum =
        att.score_percentage !== null && att.score_percentage !== undefined
          ? Number(att.score_percentage)
          : null;
      const existing = map.get(att.past_paper_id);
      if (!existing) {
        map.set(att.past_paper_id, {
          count: 1,
          bestScore: scoreNum,
          latestAttemptId: att.id,
          latestScore: scoreNum,
        });
      } else {
        existing.count += 1;
        if (scoreNum !== null) {
          existing.bestScore =
            existing.bestScore === null ? scoreNum : Math.max(existing.bestScore, scoreNum);
        }
      }
    }
    return map;
  }, [attempts]);

  const courseById = useMemo(() => {
    const map = new Map<string, CourseItem>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  // Merge enrolled course papers with any global repository papers found via global search
  const allCandidatePapers = useMemo(() => {
    if (!searchQuery.trim() || globalPapers.length === 0) {
      return papers;
    }
    const map = new Map<string, PastPaperRecord>();
    for (const p of papers) {
      map.set(p.id, p);
    }
    for (const gp of globalPapers) {
      if (!map.has(gp.id)) {
        map.set(gp.id, gp);
      }
    }
    return Array.from(map.values());
  }, [papers, globalPapers, searchQuery]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    allCandidatePapers.forEach((p) => {
      if (p.year) years.add(String(p.year));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [allCandidatePapers]);

  const readyCount = useMemo(
    () => allCandidatePapers.filter((p) => p.status === 'ready').length,
    [allCandidatePapers]
  );

  const scoredAttempts = useMemo(
    () => attempts.filter((a) => a.score_percentage !== null && a.score_percentage !== undefined),
    [attempts]
  );

  const avgScore = useMemo(() => {
    if (scoredAttempts.length === 0) return null;
    const total = scoredAttempts.reduce((sum, a) => sum + Number(a.score_percentage || 0), 0);
    return Math.round(total / scoredAttempts.length);
  }, [scoredAttempts]);

  const filteredPapers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCandidatePapers.filter((p) => {
      if (selectedCourseFilter) {
        const selCourse = courseById.get(selectedCourseFilter);
        if (selCourse && !matchesCourse(p, selCourse)) {
          return false;
        }
      }
      if (examTypeFilter !== 'all') {
        const normalizedType =
          p.exam_type === 'mid-semester' || p.exam_type === 'resit' ? p.exam_type : 'final';
        if (normalizedType !== examTypeFilter) return false;
      }
      if (yearFilter !== 'all' && String(p.year || '') !== yearFilter) {
        return false;
      }
      const attemptInfo = attemptsByPaper.get(p.id);
      if (statusFilter === 'attempted' && !attemptInfo) return false;
      if (statusFilter === 'unattempted' && attemptInfo) return false;
      if (statusFilter === 'processing' && p.status !== 'processing') return false;

      if (!q) return true;
      const joined = getCourseJoin(p);
      const safeCode = resolveDisplayCourseCode({
        courseCode: p.course_code,
        joinedCourseCode: joined?.course_code || courseById.get(p.course_id || '')?.course_code,
        normalizedCode: p.normalized_course_code,
        paperTitle: p.title,
        courseTitle: joined?.title,
      }).toLowerCase();
      const courseTitle = (joined?.title || courseById.get(p.course_id || '')?.title || '').toLowerCase();
      const paperTitle = (p.title || '').toLowerCase();
      const yearStr = p.year ? String(p.year) : '';
      return (
        safeCode.includes(q) ||
        courseTitle.includes(q) ||
        paperTitle.includes(q) ||
        yearStr.includes(q)
      );
    });
  }, [
    allCandidatePapers,
    selectedCourseFilter,
    examTypeFilter,
    yearFilter,
    statusFilter,
    searchQuery,
    attemptsByPaper,
    courseById,
  ]);

  const hasActiveFilters =
    Boolean(selectedCourseFilter) ||
    examTypeFilter !== 'all' ||
    yearFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    setSelectedCourseFilter(null);
    setExamTypeFilter('all');
    setYearFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      {/* Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Past Papers
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-muted text-xs font-mono font-bold text-foreground">
              {papers.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {selectedPapers.length > 0 ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => handleDelete(e, selectedPapers)}
                disabled={isDeleting}
                className="h-9 text-xs gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedPapers.length})
              </Button>
            ) : null}

            <Link
              href="/dashboard/courses"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
              Manage Courses
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExamFocusOpen(true)}
              className="h-9 px-3 text-xs font-semibold gap-1.5 border-primary/35 hover:bg-primary/10 text-primary cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              Exam Areas Focus
            </Button>

            <Button
              onClick={() => handleOpenUpload(selectedCourseFilter || undefined)}
              className="h-9 px-4 text-xs font-semibold bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload Past Paper
            </Button>
          </div>
        </div>

        {/* Consolidated Examination Telemetry Ribbon & Multi-Filter Header */}
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xs p-3 space-y-2.5">
          {/* Top Live Telemetry Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 text-xs font-mono text-muted-foreground">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold text-foreground tabular-nums">{courses.length}</span> Course Banks
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 text-xs font-mono text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-foreground tabular-nums">{readyCount}</span>
                <span>/ {papers.length} Ready</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 text-xs font-mono text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-foreground tabular-nums">{attempts.length}</span> Mocks
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 text-xs font-mono text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Avg:</span>
                <span className="font-bold text-foreground tabular-nums">{avgScore !== null ? `${avgScore}%` : '--'}</span>
              </div>
            </div>

            {/* View Mode & Reset Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={cn(
                    'p-1.5 rounded-md transition-colors cursor-pointer',
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={cn(
                    'p-1.5 rounded-md transition-colors cursor-pointer',
                    viewMode === 'list'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Reset
                </Button>
              ) : null}
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-md">
              {isSearchingGlobal ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Input
                placeholder="Global search: paper title, course code (e.g. BCPC 207, BSIT 309), year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 h-8 text-xs bg-background"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={examTypeFilter}
                onChange={(e) => setExamTypeFilter(e.target.value as ExamTypeFilter)}
                aria-label="Filter by exam type"
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">All Exam Types</option>
                <option value="final">Final Exam</option>
                <option value="mid-semester">Midterm Exam</option>
                <option value="resit">Resit Exam</option>
              </select>

              {yearOptions.length > 0 ? (
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  aria-label="Filter by year"
                  className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              ) : null}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AttemptStatusFilter)}
                aria-label="Filter by attempt status"
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="attempted">Attempted</option>
                <option value="unattempted">Unattempted</option>
                <option value="processing">Processing OCR</option>
              </select>
            </div>
          </div>

          {/* Course Bank Selector Chips (Horizontal Scrollable Strip) */}
          {courses.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCourseFilter(null)}
                className={cn(
                  'shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer tabular-nums',
                  selectedCourseFilter === null
                    ? 'bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] text-white border-transparent'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                )}
              >
                All Banks ({papers.length})
              </button>
              {courses.map((c) => {
                const count = papers.filter((p) => matchesCourse(p, c)).length;
                const isSelected = selectedCourseFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourseFilter(isSelected ? null : c.id)}
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer tabular-nums',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'bg-background border-border text-foreground hover:border-primary/40'
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: resolveCourseColor(c.colour || undefined) }}
                    />
                    <span>{c.course_code || c.title}</span>
                    <span className="text-[11px] text-muted-foreground">({count})</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </header>

      {/* Main 12-Col Bento Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Main Question Bank Library (8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {selectedCourseFilter
                ? `Papers for ${courseById.get(selectedCourseFilter)?.course_code || 'Selected Course'}`
                : 'Past Examination Library'}
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                {filteredPapers.length}
              </span>
            </h2>

            {selectedCourseFilter ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/courses/${selectedCourseFilter}/past-papers`}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Open Course Drills
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-6 md:p-10 shadow-xs flex flex-col items-center text-center space-y-5">
              <ExamArchiveIllustration className="w-56 h-36" />
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-foreground">
                  {papers.length === 0
                    ? 'Official Exam Archive is Empty'
                    : 'No past papers match these filters'}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {papers.length === 0
                    ? 'Upload past examination papers or mid-semester quizzes. UniStudy extracts every question, sub-part, and marking rubric for timed simulation.'
                    : 'Try clearing your course, year, or exam type filters to view archived papers.'}
                </p>
              </div>

              {papers.length === 0 ? (
                <Button
                  onClick={() => handleOpenUpload(selectedCourseFilter || undefined)}
                  className="bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white shrink-0 cursor-pointer px-6 h-10 shadow-xs"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Examination Paper
                </Button>
              ) : (
                <Button variant="outline" onClick={clearAllFilters} className="shrink-0 cursor-pointer">
                  Reset Filters
                </Button>
              )}

              <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>• Section A (MCQs) &amp; Section B (Theory)</span>
                <span>• Timed 120-minute trial simulator</span>
                <span>• AI Examiner grading against official rubrics</span>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'space-y-3'
              )}
            >
              {filteredPapers.map((paper) => {
                const courseMeta = getCourseJoin(paper);
                const examLabel = resolveExamLabel(paper.exam_type);
                const accent = resolveCourseColor(courseMeta?.colour || undefined);
                const attInfo = attemptsByPaper.get(paper.id);
                const isSelected = selectedPapers.includes(paper.id);

                return (
                  <article
                    key={paper.id}
                    onClick={() => router.push(`/dashboard/past-papers/${paper.id}`)}
                    className={cn(
                      'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-all cursor-pointer',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border/80 hover:border-primary/45'
                    )}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />

                    <div className="space-y-3 pt-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-primary/10 text-primary">
                              {resolveDisplayCourseCode({
                                courseCode: paper.course_code,
                                joinedCourseCode: courseMeta?.course_code || courseById.get(paper.course_id || '')?.course_code,
                                normalizedCode: paper.normalized_course_code,
                                paperTitle: paper.title,
                                courseTitle: courseMeta?.title || courseById.get(paper.course_id || '')?.title,
                                fallback: 'EXAM',
                              })}
                            </span>
                            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {examLabel}
                            </span>
                            {paper.year ? (
                              <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
                                {paper.year}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-1.5 text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {normalizePastPaperTitle(paper.title) || courseMeta?.title || 'Past Examination Paper'}
                          </h3>
                          {courseMeta?.title && paper.title && normalizePastPaperTitle(paper.title) !== courseMeta.title && !courseMeta.isCentral ? (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {courseMeta.title}
                            </p>
                          ) : null}
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, [paper.id])}
                            disabled={isDeleting}
                            title="Delete paper"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => toggleSelect(e, paper.id)}
                            title="Select paper"
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              aria-label="Select paper for batch action"
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </button>
                        </div>
                      </div>

                      {/* Status & Attempt Metadata */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {formatShortDate(paper.created_at)}
                        </span>

                        {paper.status === 'processing' ? (
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Processing OCR...
                          </span>
                        ) : attInfo ? (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                            {attInfo.bestScore !== null
                              ? `Best: ${Math.round(attInfo.bestScore)}% (${attInfo.count}x)`
                              : `${attInfo.count} ${attInfo.count === 1 ? 'attempt' : 'attempts'}`}
                          </span>
                        ) : (
                          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                            Unattempted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom-aligned actions */}
                    <div
                      className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {paper.source === 'klok' ? (
                        <a
                          href={paper.download_url || `/api/v1/past-questions/download?id=${encodeURIComponent(paper.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <DownloadCloud className="w-3 h-3" />
                          Download PDF
                        </a>
                      ) : (
                        <>
                          <Link
                            href={`/dashboard/past-papers/${paper.id}/attempt`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            Start Attempt
                          </Link>
                          <Link
                            href={`/dashboard/past-papers/${paper.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors cursor-pointer"
                          >
                            Questions
                          </Link>
                        </>
                      )}
                      {paper.source === 'klok' ? (
                        <a
                          href={paper.download_url || `/api/v1/past-questions/download?id=${encodeURIComponent(paper.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors cursor-pointer"
                        >
                          View Exam
                        </a>
                      ) : null}

                      {/* Course Reassignment Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPaperToMove(paper);
                        }}
                        title="Move paper to the course it belongs under"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors cursor-pointer"
                      >
                        <FolderInput className="w-3.5 h-3.5 text-primary" />
                        <span>Move Course</span>
                      </button>

                      {attInfo ? (
                        <Link
                          href={`/dashboard/past-papers/results/${attInfo.latestAttemptId}`}
                          className="ml-auto inline-flex items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors cursor-pointer"
                        >
                          Examiner Report
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Intelligence Rail (4 cols): Recent Attempts & Course Bank Coverage */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Recent AI Examiner History */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Recent Examiner Reports
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Latest timed attempts &amp; AI marking feedback
                </p>
              </div>
              <Award className="w-4 h-4 text-primary" />
            </div>

            {attempts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-1.5">
                <p className="text-xs font-semibold text-foreground">No past paper attempts yet</p>
                <p className="text-xs text-muted-foreground">
                  Start any uploaded paper to unlock graded feedback and full model solutions.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {attempts.slice(0, 6).map((att) => {
                  const joinedPaper = Array.isArray(att.past_papers)
                    ? att.past_papers[0]
                    : att.past_papers;
                  const linkedCourse = joinedPaper?.course_id
                    ? courseById.get(joinedPaper.course_id)
                    : undefined;
                  const pct =
                    att.score_percentage !== null && att.score_percentage !== undefined
                      ? Math.round(Number(att.score_percentage))
                      : null;
                  const scoreBadge =
                    pct === null
                      ? 'bg-muted text-muted-foreground'
                      : pct >= 70
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : pct >= 50
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300';

                  return (
                    <li key={att.id} className="py-2.5 first:pt-0 last:pb-0">
                      <Link
                        href={`/dashboard/past-papers/results/${att.id}`}
                        className="group flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {joinedPaper?.title || 'Past Paper Attempt'}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {resolveDisplayCourseCode({
                              courseCode: linkedCourse?.course_code,
                              courseTitle: linkedCourse?.title,
                              paperTitle: joinedPaper?.title,
                              fallback: 'Exam',
                            })} · {formatShortDate(att.completed_at || att.started_at)}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold tabular-nums',
                            scoreBadge
                          )}
                        >
                          {pct !== null ? `${pct}%` : 'Pending'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Course Bank Coverage */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Course Bank Coverage
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload papers directly into any module
                </p>
              </div>
              <Layers className="w-4 h-4 text-primary" />
            </div>

            {courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">No courses created yet.</p>
                <Link
                  href="/dashboard/courses?action=new"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Create your first course
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {courses.map((course) => {
                  const count = papers.filter((p) => matchesCourse(p, course)).length;
                  return (
                    <li
                      key={course.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: resolveCourseColor(course.colour || undefined) }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {resolveDisplayCourseCode({
                              courseCode: course.course_code,
                              courseTitle: course.title,
                              fallback: course.title || 'Course',
                            })}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                            {count} {count === 1 ? 'paper' : 'papers'}
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenUpload(course.id)}
                        className="h-7 px-2.5 text-[11px] gap-1 shrink-0 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        Add
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={effectiveUploadOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setPreselectedCourseId(null);
          if (uploadParam === 'upload') {
            setDismissedUploadAction(true);
            router.replace('/dashboard/past-papers');
          }
        }}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          setPreselectedCourseId(null);
          if (uploadParam === 'upload') {
            setDismissedUploadAction(true);
            router.replace('/dashboard/past-papers');
          }
          void loadData();
        }}
        preselectedCourseId={preselectedCourseId}
      />

      {/* University Moodle / Portal Sync Modal */}
      <MoodleSyncModal
        isOpen={isMoodleModalOpen}
        onClose={() => setIsMoodleModalOpen(false)}
        onSuccess={() => void loadData()}
      />

      {/* Exam Areas of Concentration Workspace */}
      <ExamFocusDialog
        open={effectiveExamFocusOpen}
        onOpenChange={handleExamFocusOpenChange}
        courses={courses}
        initialCourseId={selectedCourseFilter || courses[0]?.id}
        defaultTab="questions"
      />

      {/* Course Reassignment Modal */}
      <MovePaperDialog
        isOpen={Boolean(paperToMove)}
        onClose={() => setPaperToMove(null)}
        paper={paperToMove}
        courses={courses}
        onSuccess={() => {
          setPaperToMove(null);
          void loadData();
        }}
      />
    </div>
  );
}
