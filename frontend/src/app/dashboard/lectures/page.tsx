'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  ArrowRight,
  Play,
  BrainCircuit,
  Layers,
  FolderPlus,
  Clock,
  Upload,
  Filter,
  CheckCircle2,
  Calendar,
  Loader2,
  Trash2,
  CheckSquare,
  X,
  ArrowUpDown,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { resolveCourseColor } from '@/lib/constants/courses';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import { bulkDeleteLectures } from '@/app/actions/lectures';
import { ExamFocusDialog } from '@/components/exam-focus/ExamFocusDialog';
import { UploadLectureDialog } from '@/components/courses/UploadLectureDialog';
import { DeleteLectureButton } from '@/components/courses/DeleteLectureButton';
import { isPlaceholderSlideUrl, getSlideThumbnailUrl } from '@/lib/images';

interface LectureItem {
  id: string;
  title: string;
  week?: number | null;
  slide_count?: number | null;
  created_at?: string | null;
  processing?: boolean | null;
  cover_image_url?: string | null;
}

interface CourseItem {
  id: string;
  title: string;
  course_code?: string | null;
  semester?: number | null;
  year?: number | null;
  colour?: string | null;
  is_archived?: boolean | null;
  created_at?: string | null;
  lectures?: LectureItem[];
}

function resolveWeekNumber(lec: LectureItem): number | null {
  if (typeof lec.week === 'number' && !isNaN(lec.week) && lec.week > 0) {
    return lec.week;
  }
  if (typeof (lec as any).week === 'string' && (lec as any).week.trim()) {
    const parsed = parseInt((lec as any).week.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (lec.title) {
    const match = String(lec.title).match(/(?:week|w|lecture|lec|session)[\s._-]*(\d{1,2})/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (val >= 1 && val <= 52) return val;
    }
  }
  return null;
}

function SlideDeckCover({
  thumbnailSrc,
  title,
  processing,
  slideCount,
}: {
  thumbnailSrc: string;
  title: string;
  processing?: boolean | null;
  slideCount?: number | null;
}) {
  const [hasError, setHasError] = useState(false);
  const showImage = Boolean(thumbnailSrc && !hasError);

  return (
    <div className="relative block w-full aspect-[16/9] bg-muted/40 overflow-hidden">
      {showImage ? (
        <Image
          src={thumbnailSrc}
          alt={`Cover slide – ${title || 'Untitled Lecture'}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          unoptimized
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/60 bg-muted/20">
          <FileText className="w-10 h-10" strokeWidth={1.2} />
          <span className="text-[10px] font-mono uppercase tracking-wider">
            {processing ? 'Processing...' : 'No Preview'}
          </span>
        </div>
      )}
      {!processing && (slideCount ?? 0) > 0 && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/70 text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm z-10">
          <Layers className="w-3 h-3" />
          {slideCount}
        </span>
      )}
    </div>
  );
}

export default function LecturesHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCourseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | 'all'>(urlCourseId || 'all');
  const [sortOrder, setSortOrder] = useState<'sequence' | 'newest'>('sequence');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLectureIds, setSelectedLectureIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isExamFocusOpen, setIsExamFocusOpen] = useState(false);

  const initialUrlCourseApplied = useRef(false);
  const lastUrlCourseIdRef = useRef(urlCourseId);

  // Sync state if searchParams.get('courseId') changes via router navigation / external link
  useEffect(() => {
    if (urlCourseId !== lastUrlCourseIdRef.current) {
      lastUrlCourseIdRef.current = urlCourseId;
      setSelectedCourseId(urlCourseId || 'all');
      setSelectedLectureIds(new Set());
    }
  }, [urlCourseId]);

  // Sync state if user clicks browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const cId = params.get('courseId');
      lastUrlCourseIdRef.current = cId;
      setSelectedCourseId(cId || 'all');
      setSelectedLectureIds(new Set());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle user explicitly choosing a course from the filter chips or breadcrumbs
  const handleSelectCourse = useCallback((newCourseId: string | 'all') => {
    setSelectedCourseId(newCourseId);
    setSelectedLectureIds(new Set());
    lastUrlCourseIdRef.current = newCourseId === 'all' ? null : newCourseId;

    try {
      const url = new URL(window.location.href);
      if (newCourseId === 'all') {
        url.searchParams.delete('courseId');
      } else {
        url.searchParams.set('courseId', newCourseId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    } catch {
      // safe fallback
    }
  }, []);

  // Fetch courses and their lectures
  const loadCourses = useCallback(async () => {
    try {
      let data: any = null;
      try {
        const res = await fetch(`/api/courses?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('Direct fetch /api/courses failed, falling back to apiFetch:', e);
      }

      if (!Array.isArray(data) || data.length === 0) {
        try {
          data = await apiFetch('/courses');
        } catch {
          // quiet fallback
        }
      }

      if (Array.isArray(data)) {
        const activeOnly = data
          .filter((c: CourseItem) => !c.is_archived)
          .map((c: CourseItem) => ({
            ...c,
            lectures: (c.lectures || []).map((l: any) => ({
              ...l,
              processing: Boolean(l.processing),
            })),
          }));
        // Arrange courses in strict ascending alphanumeric order by course_code and title
        const sortedCourses = [...activeOnly].sort((a: CourseItem, b: CourseItem) => {
          const codeA = (a.course_code || a.title || '').trim();
          const codeB = (b.course_code || b.title || '').trim();
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setCourses(sortedCourses);

        // On initial page load only, apply urlCourseId if valid
        if (!initialUrlCourseApplied.current) {
          initialUrlCourseApplied.current = true;
          if (urlCourseId && sortedCourses.some((c: CourseItem) => c.id === urlCourseId)) {
            setSelectedCourseId(urlCourseId);
          }
        } else {
          // On background polling/re-fetches, preserve user selection unless that course was deleted
          setSelectedCourseId((prev) => {
            if (prev === 'all') return 'all';
            return sortedCourses.some((c: CourseItem) => c.id === prev) ? prev : 'all';
          });
        }
      }
    } catch (err) {
      console.error('Failed to load courses for lectures hub', err);
    } finally {
      setLoading(false);
    }
  }, [urlCourseId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Live real-time Supabase subscription for instant lecture and slide updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime:lectures_hub_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures' }, () => {
        void loadCourses();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        void loadCourses();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadCourses]);

  // Listen for immediate lecture upload events from anywhere in the window
  useEffect(() => {
    const handleUploaded = () => {
      void loadCourses();
    };
    window.addEventListener('lecture-uploaded', handleUploaded);
    return () => window.removeEventListener('lecture-uploaded', handleUploaded);
  }, [loadCourses]);

  // Auto-refresh lectures list if any lecture is still processing in the background
  const hasProcessingLecture = useMemo(() => {
    return courses.some((c) => (c.lectures || []).some((l: any) => l.processing));
  }, [courses]);

  useEffect(() => {
    if (!hasProcessingLecture) return;
    let pollCount = 0;
    const MAX_POLLS = 20;
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      pollCount += 1;
      if (pollCount > MAX_POLLS) {
        clearInterval(interval);
        return;
      }
      await loadCourses();
    }, 8000);
    return () => clearInterval(interval);
  }, [hasProcessingLecture, loadCourses]);

  // Aggregate all lectures with their course metadata
  const allLecturesWithCourse = useMemo(() => {
    const list: Array<{
      lecture: LectureItem;
      course: CourseItem;
    }> = [];

    for (const c of courses) {
      const lecs = c.lectures || [];
      for (const lec of lecs) {
        list.push({ lecture: lec, course: c });
      }
    }

    // Sort lectures according to selected order
    return list.sort((a, b) => {
      if (sortOrder === 'newest') {
        const tA = a.lecture.created_at ? new Date(a.lecture.created_at).getTime() : 0;
        const tB = b.lecture.created_at ? new Date(b.lecture.created_at).getTime() : 0;
        return tB - tA;
      }

      // Default 'sequence': Arrange by course in order, then within each course by week / sequence
      const codeA = (a.course.course_code || a.course.title || '').trim();
      const codeB = (b.course.course_code || b.course.title || '').trim();
      const codeComp = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      if (codeComp !== 0) return codeComp;

      const wA = resolveWeekNumber(a.lecture);
      const wB = resolveWeekNumber(b.lecture);
      if (wA !== null && wB !== null && wA !== wB) {
        return wA - wB;
      }
      if (wA !== null && wB === null) return -1;
      if (wA === null && wB !== null) return 1;

      return (a.lecture.title || '').localeCompare(b.lecture.title || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [courses, sortOrder]);

  // Filter lectures based on selected course and search query
  const filteredLectures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allLecturesWithCourse.filter(({ lecture, course }) => {
      if (selectedCourseId !== 'all' && course.id !== selectedCourseId) {
        return false;
      }
      if (q) {
        const titleMatch = (lecture.title || '').toLowerCase().includes(q);
        const codeMatch = (course.course_code || '').toLowerCase().includes(q);
        const courseTitleMatch = (course.title || '').toLowerCase().includes(q);
        return titleMatch || codeMatch || courseTitleMatch;
      }
      return true;
    });
  }, [allLecturesWithCourse, selectedCourseId, searchQuery]);

  const activeCourse = useMemo(() => {
    if (selectedCourseId === 'all') return null;
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const toggleSelectLecture = useCallback((id: string) => {
    setSelectedLectureIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedLectureIds((prev) => {
      if (prev.size === filteredLectures.length && filteredLectures.length > 0) {
        return new Set();
      }
      return new Set(filteredLectures.map(({ lecture }) => lecture.id));
    });
  }, [filteredLectures]);

  const handleClearSelection = useCallback(() => {
    setSelectedLectureIds(new Set());
  }, []);

  const handleBulkDeleteConfirm = async () => {
    if (selectedLectureIds.size === 0) return;
    setIsBulkDeleting(true);

    const idsToDelete = Array.from(selectedLectureIds);
    try {
      const res = await bulkDeleteLectures(idsToDelete, activeCourse?.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to bulk delete lectures');
      }

      setCourses((prev) =>
        prev.map((c) => ({
          ...c,
          lectures: (c.lectures || []).filter((l) => !selectedLectureIds.has(l.id)),
        }))
      );

      toast.success(
        `Successfully deleted ${idsToDelete.length} lecture deck${idsToDelete.length > 1 ? 's' : ''}`
      );
      setSelectedLectureIds(new Set());
      setIsBulkDeleteDialogOpen(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lecture-uploaded'));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete selected lectures');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totalLectureCount = allLecturesWithCourse.length;

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-6">
      {/* Studio Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link
              href="/dashboard/courses"
              className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold hover:underline"
            >
              Courses
            </Link>
            <span aria-hidden="true">/</span>
            {activeCourse ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSelectCourse('all')}
                  className="font-mono font-semibold text-foreground hover:text-primary transition-colors cursor-pointer text-xs"
                >
                  {activeCourse.course_code || 'COURSE'}
                </button>
                <span aria-hidden="true">/</span>
              </>
            ) : null}
            <span>Lectures &amp; Slide Decks</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-primary" strokeWidth={1.75} />
            {activeCourse ? `${activeCourse.course_code} – Lectures & Slide Decks` : 'Lectures & Slide Decks'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {activeCourse
              ? `All official presentation slides and study materials for ${activeCourse.title}.`
              : 'Select what course you want to study, resume your latest deck, or review slides with the AI Tutor.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExamFocusOpen(true)}
            className="h-9 px-3 text-xs font-semibold gap-1.5 border-primary/35 hover:bg-primary/10 text-primary cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            Exam Areas
          </Button>
          {activeCourse ? (
            <UploadLectureDialog
              courseId={activeCourse.id}
              courseCode={activeCourse.course_code || 'COURSE'}
              onSuccess={loadCourses}
            />
          ) : courses.length > 0 ? (
            <UploadLectureDialog
              courseId={courses[0].id}
              courseCode={courses[0].course_code || 'COURSE'}
              onSuccess={loadCourses}
            />
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/dashboard/courses?action=new')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer text-xs h-9 px-3.5"
            >
              <FolderPlus className="w-4 h-4" />
              New Course
            </Button>
          )}

          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted/70 px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            Manage Courses
          </Link>
        </div>
      </header>

      {/* Course Selection Section: Choose what course you want to study */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Choose What Course You Want to Study
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click a course to view all its slide decks, flashcards, and exam practice.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[220px] sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures or topics..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Course Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSelectCourse('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              selectedCourseId === 'all'
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <span>All Courses</span>
            <span
              className={cn(
                'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                selectedCourseId === 'all'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {totalLectureCount}
            </span>
          </button>

          {courses.map((course) => {
            const isSelected = selectedCourseId === course.id;
            const accent = resolveCourseColor(course.colour);
            const count = (course.lectures || []).length;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => handleSelectCourse(course.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-2',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/40'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <span className="font-mono text-[11px] font-bold">
                  {course.course_code || 'COURSE'}
                </span>
                <span className="max-w-[140px] truncate font-medium text-muted-foreground">
                  {course.title}
                </span>
                <span className="text-[10px] font-mono bg-muted/60 px-1.5 py-0.2 rounded text-muted-foreground tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Course Quick Actions Banner */}
        {activeCourse && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: resolveCourseColor(activeCourse.colour) }}
              />
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="font-mono text-primary font-bold">
                    {activeCourse.course_code || 'COURSE'}
                  </span>
                  <span>{activeCourse.title}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {(activeCourse.lectures || []).length} total slide{' '}
                  {(activeCourse.lectures || []).length === 1 ? 'deck' : 'decks'} uploaded
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsExamFocusOpen(true)}
                className="h-7 px-2.5 text-xs font-medium gap-1 border-primary/35 text-primary hover:bg-primary/10 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Exam Areas
              </Button>
              <Link
                href={`/dashboard/courses/${activeCourse.id}/flashcards`}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                Cards
              </Link>
              <Link
                href={`/dashboard/courses/${activeCourse.id}/quiz`}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Quiz
              </Link>
              <Link
                href={`/dashboard/courses/${activeCourse.id}/past-papers`}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Past Papers
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Lectures Content Grid */}
      {loading ? (
        <div className="rounded-2xl border border-border p-12 text-center space-y-3 bg-card">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading course lectures...</p>
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-4 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {courses.length === 0
                ? 'No courses created yet'
                : activeCourse
                  ? `No lectures uploaded for ${activeCourse.course_code || activeCourse.title}`
                  : 'No lectures found'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {courses.length === 0
                ? 'Create your first course to upload PDF slide decks, generate flashcards, and use AI lecture tutoring.'
                : 'Upload your presentation slides (PDF) to automatically extract text, summaries, and interactive flashcards.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            {activeCourse ? (
              <UploadLectureDialog
                courseId={activeCourse.id}
                courseCode={activeCourse.course_code || 'COURSE'}
                onSuccess={loadCourses}
              />
            ) : courses.length > 0 ? (
              <UploadLectureDialog
                courseId={courses[0].id}
                courseCode={courses[0].course_code || 'COURSE'}
                onSuccess={loadCourses}
              />
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/dashboard/courses?action=new')}
                className="bg-primary text-primary-foreground text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create First Course
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-3">
              <span className="font-mono uppercase tracking-wider font-semibold">
                Showing {filteredLectures.length}{' '}
                {filteredLectures.length === 1 ? 'Lecture Deck' : 'Lecture Decks'}
              </span>

              {filteredLectures.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {selectedLectureIds.size === filteredLectures.length && filteredLectures.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSortOrder('sequence')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1",
                    sortOrder === 'sequence'
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Sequential order: Arranged by course and week sequence"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Sequential</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('newest')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1",
                    sortOrder === 'newest'
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Newest uploaded first"
                >
                  <Clock className="w-3 h-3" />
                  <span>Newest</span>
                </button>
              </div>

              {selectedLectureIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  className="h-8 px-3 text-xs gap-1.5 cursor-pointer font-semibold shadow-xs animate-in fade-in"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected ({selectedLectureIds.size})
                </Button>
              )}
              <span className="text-[11px] hidden lg:inline">Click any deck to open slide viewer</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLectures.map(({ lecture, course }) => {
              const accentColor = resolveCourseColor(course.colour);
              const formattedDate = lecture.created_at
                ? new Date(lecture.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recent';
              const isSelected = selectedLectureIds.has(lecture.id);
              const hasCover = lecture.cover_image_url && !isPlaceholderSlideUrl(lecture.cover_image_url);
              const thumbnailSrc = hasCover ? getSlideThumbnailUrl(lecture.cover_image_url) : '';

              return (
                <article
                  key={lecture.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border bg-card transition-all overflow-hidden",
                    isSelected
                      ? "border-destructive/70 ring-2 ring-destructive/20 bg-destructive/[0.02]"
                      : "border-border/80 hover:border-primary/50 hover:shadow-md"
                  )}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5 z-10"
                    style={{ backgroundColor: accentColor }}
                  />

                  {/* Slide Cover Thumbnail */}
                  <Link
                    href={`/dashboard/courses/${course.id}/lectures/${lecture.id}`}
                    className="relative block w-full cursor-pointer"
                    aria-label={`Open ${lecture.title || 'Untitled Lecture'}`}
                  >
                    <SlideDeckCover
                      thumbnailSrc={thumbnailSrc}
                      title={lecture.title}
                      processing={lecture.processing}
                      slideCount={lecture.slide_count}
                    />
                  </Link>

                  <div className="p-4 pt-3 space-y-2.5 flex-1 flex flex-col">
                    {/* Course Code, Checkbox & Metadata Top Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center p-0.5 rounded cursor-pointer select-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelectLecture(lecture.id);
                          }}
                          title={isSelected ? 'Deselect deck' : 'Select deck for bulk action'}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectLecture(lecture.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-checked:bg-destructive data-checked:border-destructive border-border"
                            aria-label={`Select ${lecture.title}`}
                          />
                        </div>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: accentColor }}
                        />
                        <span className="font-mono text-xs font-bold text-foreground">
                          {course.course_code || 'COURSE'}
                        </span>
                        {lecture.week ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
                            Week {lecture.week}
                          </span>
                        ) : null}
                      </div>

                      <span className="text-[11px] font-mono text-muted-foreground">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Lecture Title */}
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/courses/${course.id}/lectures/${lecture.id}`}
                        className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
                      >
                        {lecture.title || 'Untitled Lecture'}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {course.title}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                      {lecture.processing ? (
                        <span className="inline-flex items-center gap-1.5 text-[#D89A06] font-semibold animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Processing Slides...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                          {lecture.slide_count || 0} slides
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        Interactive AI
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    {lecture.processing ? (
                      <Link
                        href={`/dashboard/courses/${course.id}/lectures/${lecture.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D89A06] hover:bg-[#C28905] text-[#00004E] py-2 px-3 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing Slides...
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/courses/${course.id}/lectures/${lecture.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Study Slides
                      </Link>
                    )}

                    <Link
                      href={`/dashboard/courses/${course.id}/flashcards`}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted p-2 text-xs text-foreground transition-colors cursor-pointer"
                      title="Course Flashcards"
                    >
                      <BrainCircuit className="w-4 h-4 text-primary" />
                    </Link>

                    <DeleteLectureButton
                      lectureId={lecture.id}
                      courseId={course.id}
                      lectureTitle={lecture.title || 'Untitled Lecture'}
                      onDeleted={() => {
                        setSelectedLectureIds((prev) => {
                          const next = new Set(prev);
                          next.delete(lecture.id);
                          return next;
                        });
                        setCourses((prev) =>
                          prev.map((c) =>
                            c.id === course.id
                              ? {
                                  ...c,
                                  lectures: (c.lectures || []).filter((l) => l.id !== lecture.id),
                                }
                              : c
                          )
                        );
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedLectureIds.size > 0 && (
        <aside
          role="region"
          aria-label="Bulk actions toolbar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card/95 backdrop-blur-md border border-border/80 shadow-xl rounded-2xl px-5 py-3 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            {selectedLectureIds.size} deck{selectedLectureIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="h-4 w-px bg-border/80" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setIsBulkDeleteDialogOpen(true)}
            className="h-8 px-3 text-xs gap-1.5 cursor-pointer font-semibold shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedLectureIds.size})
          </Button>
        </aside>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete {selectedLectureIds.size} Lecture Deck{selectedLectureIds.size > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs text-muted-foreground pt-1">
              <span>
                This will permanently delete the <strong className="text-foreground">{selectedLectureIds.size}</strong> selected lecture deck{selectedLectureIds.size > 1 ? 's' : ''} and all associated extracted slides and study notes. This action cannot be undone.
              </span>
              <div className="mt-2.5 p-2.5 rounded-lg bg-muted/60 border border-border/40 text-[11px] font-mono max-h-36 overflow-y-auto space-y-1">
                {allLecturesWithCourse
                  .filter(({ lecture }) => selectedLectureIds.has(lecture.id))
                  .map(({ lecture, course }) => (
                    <div key={lecture.id} className="truncate">
                      • {course.course_code ? `[${course.course_code}] ` : ''}{lecture.title || 'Untitled Lecture'}
                    </div>
                  ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDeleteConfirm();
              }}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 cursor-pointer"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedLectureIds.size} Deck${selectedLectureIds.size > 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExamFocusDialog
        open={isExamFocusOpen}
        onOpenChange={setIsExamFocusOpen}
        courses={courses}
        initialCourseId={selectedCourseId !== 'all' ? selectedCourseId : courses[0]?.id}
      />
    </div>
  );
}
