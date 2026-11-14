'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  UploadCloud,
  BookOpen,
  Trash2,
  FileText,
  Edit3,
  Archive,
  ArchiveRestore,
  Check,
  Search,
  Calculator,
  LineChart,
  Layers,
  BrainCircuit,
  ArrowRight,
  FileCheck2,
  LayoutGrid,
  List,
  FolderOpen,
} from 'lucide-react';
import { COURSE_COLORS, resolveCourseColor } from '@/lib/constants/courses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';
import { UploadLectureDialog } from '@/components/courses/UploadLectureDialog';
import { cn } from '@/lib/utils';

interface LectureSummary {
  id: string;
  title: string | null;
}

interface PastPaperSummary {
  id: string;
  title: string | null;
  year?: number | null;
  exam_type?: string | null;
  status?: string | null;
}

interface CourseRecord {
  id: string;
  user_id?: string | null;
  title: string;
  course_code: string | null;
  colour: string | null;
  semester: number | string | null;
  year: number | null;
  is_archived?: boolean | null;
  created_at?: string | null;
  lectures?: LectureSummary[] | null;
  past_papers?: PastPaperSummary[] | null;
}

type SortKey = 'newest' | 'most_lectures' | 'alphabetical';

function normalizeCourse(raw: CourseRecord): CourseRecord {
  const validLectures = Array.isArray(raw.lectures)
    ? raw.lectures.filter((l) => l && !(l.title || '').startsWith('[FAILED'))
    : [];
  const papers = Array.isArray(raw.past_papers) ? raw.past_papers : [];
  return {
    ...raw,
    lectures: validLectures,
    past_papers: papers,
  };
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('#5B2D8E');
  const [newCourseSemester, setNewCourseSemester] = useState('1');
  const [newCourseYear, setNewCourseYear] = useState(new Date().getFullYear().toString());

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseColor, setEditCourseColor] = useState('#5B2D8E');
  const [editCourseSemester, setEditCourseSemester] = useState('1');
  const [editCourseYear, setEditCourseYear] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const tabParam = searchParams.get('tab');

  const [dismissedNewAction, setDismissedNewAction] = useState(false);
  const [manualTab, setManualTab] = useState<{ forUrl: string | null; tab: 'active' | 'archived' } | null>(null);

  const activeView: 'active' | 'archived' =
    manualTab && manualTab.forUrl === tabParam
      ? manualTab.tab
      : tabParam === 'archived'
        ? 'archived'
        : 'active';

  const switchView = (nextTab: 'active' | 'archived') => {
    setManualTab({ forUrl: tabParam, tab: nextTab });
    router.replace(nextTab === 'archived' ? '/dashboard/courses?tab=archived' : '/dashboard/courses');
  };

  const effectiveCourseDialogOpen = isCourseDialogOpen || (actionParam === 'new' && !dismissedNewAction);
  const handleCourseDialogChange = (open: boolean) => {
    setIsCourseDialogOpen(open);
    if (!open && actionParam === 'new') {
      setDismissedNewAction(true);
      router.replace(activeView === 'archived' ? '/dashboard/courses?tab=archived' : '/dashboard/courses');
    } else if (open) {
      setDismissedNewAction(false);
    }
  };

  const loadCourseList = async (): Promise<{ list: CourseRecord[]; err: string | null }> => {
    let data: CourseRecord[] | null = null;
    let err: string | null = null;

    try {
      const fetched = await apiFetch('/courses');
      if (Array.isArray(fetched) && fetched.length > 0) {
        data = fetched as CourseRecord[];
      }
    } catch (apiErr) {
      console.warn('apiFetch /courses failed, checking Next.js route / direct Supabase:', apiErr);
    }

    if (!data || data.length === 0) {
      try {
        const res = await fetch('/api/courses');
        if (res.ok) {
          const nextData = await res.json();
          if (Array.isArray(nextData) && nextData.length > 0) {
            data = nextData as CourseRecord[];
          }
        }
      } catch {
        // ignore and proceed to direct supabase client
      }
    }

    if (!data || data.length === 0) {
      const { data: dbData, error } = await supabase
        .from('courses')
        .select('id, user_id, title, course_code, colour, semester, year, is_archived, created_at, lectures(id, title), past_papers(id, title, year, exam_type, status)')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(dbData)) {
        data = dbData as CourseRecord[];
      } else if (error) {
        console.warn('Direct courses join query failed, falling back to base select:', error.message);
        const { data: baseData, error: baseErr } = await supabase
          .from('courses')
          .select('id, user_id, title, course_code, colour, semester, year, is_archived, created_at')
          .order('created_at', { ascending: false });

        if (!baseErr && Array.isArray(baseData)) {
          data = baseData as CourseRecord[];
        } else if (baseErr) {
          err = baseErr.message;
        }
      }
    }

    return { list: (data || []).map(normalizeCourse), err };
  };

  const fetchCourses = async () => {
    setErrorMsg(null);
    try {
      const { list, err } = await loadCourseList();
      if (err) setErrorMsg(err);
      setCourses(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load courses';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const { list, err } = await loadCourseList();
        if (!active) return;
        setErrorMsg(err);
        setCourses(list);
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load courses';
        setErrorMsg(msg);
        toast.error(msg);
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteCourse = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this course?')) return;

    const previousCourses = [...courses];
    setCourses((prev) => prev.filter((c) => c.id !== id));

    try {
      await apiFetch(`/courses/${id}`, { method: 'DELETE' });
      toast.success('Course deleted');
    } catch (err: unknown) {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (!error) {
        toast.success('Course deleted');
      } else {
        setCourses(previousCourses);
        toast.error(err instanceof Error ? err.message : 'Failed to delete course');
      }
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseCode.trim() || !newCourseName.trim()) {
      toast.error('Please provide both a course code and a name.');
      return;
    }

    try {
      const colour = newCourseColor || '#5B2D8E';
      const newCourseData = {
        course_code: newCourseCode.trim().toUpperCase(),
        title: newCourseName.trim(),
        colour,
        semester: parseInt(newCourseSemester, 10) || 1,
        year: parseInt(newCourseYear, 10) || new Date().getFullYear(),
      };

      let fetchedCourse: CourseRecord | null = null;
      try {
        fetchedCourse = (await apiFetch('/courses', {
          method: 'POST',
          body: JSON.stringify(newCourseData),
        })) as CourseRecord;
      } catch (apiErr) {
        console.warn('apiFetch POST /courses failed, falling back to direct Supabase insert:', apiErr);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('courses')
            .insert({ ...newCourseData, user_id: user.id })
            .select('id, user_id, title, course_code, colour, semester, year, is_archived, created_at, lectures(id, title)')
            .single();
          if (!error && data) {
            fetchedCourse = data as CourseRecord;
          } else {
            throw error || apiErr;
          }
        } else {
          throw apiErr;
        }
      }

      if (fetchedCourse) {
        setCourses((prev) => [normalizeCourse(fetchedCourse!), ...prev]);
      }

      setNewCourseCode('');
      setNewCourseName('');
      setIsCourseDialogOpen(false);
      if (actionParam === 'new') {
        setDismissedNewAction(true);
        router.replace('/dashboard/courses');
      }
      switchView('active');
      toast.success('Course added');
    } catch (err: unknown) {
      console.error('Unexpected error adding course:', err);
      toast.error(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const openEditDialog = (e: React.MouseEvent, course: CourseRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setEditCourseId(course.id);
    setEditCourseCode(course.course_code || '');
    setEditCourseName(course.title || '');
    setEditCourseColor(resolveCourseColor(course.colour || undefined));
    setEditCourseSemester(course.semester?.toString() || '1');
    setEditCourseYear(course.year?.toString() || new Date().getFullYear().toString());
    setIsEditDialogOpen(true);
  };

  const handleUpdateCourse = async () => {
    if (!editCourseId) return;
    try {
      const updatePayload = {
        course_code: editCourseCode.trim().toUpperCase(),
        title: editCourseName.trim(),
        colour: editCourseColor,
        semester: parseInt(editCourseSemester, 10) || 1,
        year: parseInt(editCourseYear, 10) || new Date().getFullYear(),
      };

      let updatedCourse: CourseRecord | null = null;
      try {
        updatedCourse = (await apiFetch(`/courses/${editCourseId}`, {
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
        })) as CourseRecord;
      } catch (apiErr) {
        console.warn('apiFetch PATCH /courses failed, falling back to direct Supabase update:', apiErr);
        const { data, error } = await supabase
          .from('courses')
          .update(updatePayload)
          .eq('id', editCourseId)
          .select('id, user_id, title, course_code, colour, semester, year, is_archived, created_at, lectures(id, title)')
          .single();
        if (!error && data) {
          updatedCourse = data as CourseRecord;
        } else {
          throw error || apiErr;
        }
      }

      if (updatedCourse) {
        setCourses((prev) =>
          prev.map((c) => (c.id === editCourseId ? normalizeCourse({ ...c, ...updatedCourse }) : c))
        );
      }
      setIsEditDialogOpen(false);
      toast.success('Course updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating course');
    }
  };

  const handleArchiveCourse = async (e: React.MouseEvent, id: string, isArchived: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let updatedCourse: CourseRecord | null = null;
      try {
        updatedCourse = (await apiFetch(`/courses/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_archived: !isArchived }),
        })) as CourseRecord;
      } catch (apiErr) {
        const { data, error } = await supabase
          .from('courses')
          .update({ is_archived: !isArchived })
          .eq('id', id)
          .select('id, user_id, title, course_code, colour, semester, year, is_archived, created_at, lectures(id, title)')
          .single();
        if (!error && data) {
          updatedCourse = data as CourseRecord;
        } else {
          throw error || apiErr;
        }
      }

      if (updatedCourse) {
        setCourses((prev) =>
          prev.map((c) => (c.id === id ? normalizeCourse({ ...c, ...updatedCourse }) : c))
        );
      }
      toast.success(isArchived ? 'Course restored to active modules' : 'Course moved to archive');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error archiving course');
    }
  };

  const activeCourses = useMemo(
    () => courses.filter((c) => !c.is_archived && c.colour !== '#hidden'),
    [courses]
  );
  const archivedCourses = useMemo(
    () => courses.filter((c) => Boolean(c.is_archived) && c.colour !== '#hidden'),
    [courses]
  );

  const totalActiveLectures = useMemo(
    () => activeCourses.reduce((sum, c) => sum + (c.lectures?.length || 0), 0),
    [activeCourses]
  );

  const totalActivePapers = useMemo(
    () => activeCourses.reduce((sum, c) => sum + (c.past_papers?.length || 0), 0),
    [activeCourses]
  );

  const semesterOptions = useMemo(() => {
    const sems = new Set<string>();
    courses.forEach((c) => {
      if (c.semester !== null && c.semester !== undefined && String(c.semester).trim()) {
        sems.add(String(c.semester));
      }
    });
    return Array.from(sems).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [courses]);

  const displayedList = useMemo(() => {
    const pool = activeView === 'archived' ? archivedCourses : activeCourses;
    const q = searchQuery.trim().toLowerCase();

    const filtered = pool.filter((c) => {
      const matchesQuery =
        !q ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.course_code || '').toLowerCase().includes(q);
      const matchesSem =
        semesterFilter === 'all' || String(c.semester || '') === semesterFilter;
      return matchesQuery && matchesSem;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === 'most_lectures') {
        return (b.lectures?.length || 0) - (a.lectures?.length || 0);
      }
      if (sortKey === 'alphabetical') {
        return (a.course_code || a.title).localeCompare(b.course_code || b.title);
      }
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tB - tA;
    });
  }, [activeView, activeCourses, archivedCourses, searchQuery, semesterFilter, sortKey]);

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      {/* Header + Course Study Tools Dock */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold">
                Academic Workspace
              </span>
              <span aria-hidden="true">/</span>
              <span>Modules, Slides, Quizzes &amp; Computation Tools</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Courses Workspace
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/calculator?tab=solver"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/35 hover:bg-muted/70 hover:border-primary/40 px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <Calculator className="h-3.5 w-3.5 text-primary" />
              Math Solver
            </Link>
            <Link
              href="/dashboard/calculator?tab=graph"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/35 hover:bg-muted/70 hover:border-primary/40 px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <LineChart className="h-3.5 w-3.5 text-primary" />
              Graph Plotter
            </Link>

            <Dialog open={effectiveCourseDialogOpen} onOpenChange={handleCourseDialogChange}>
              <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-[#5B2D8E] dark:bg-primary hover:bg-[#492274] dark:hover:bg-primary/90 text-white h-9 px-4 py-2 gap-1.5 text-xs font-semibold transition-colors cursor-pointer">
                <Plus size={15} /> Add Course
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Create new course</DialogTitle>
                  <DialogDescription>
                    Add a university module to organize your lecture slides, flashcards, quizzes, and past papers.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code" className="text-right">Course Code</Label>
                    <Input
                      id="code"
                      placeholder="e.g. CS101"
                      className="col-span-3"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Course Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Data Structures"
                      className="col-span-3"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="semester" className="text-right">Term</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                      <select
                        id="semester"
                        value={newCourseSemester}
                        onChange={(e) => setNewCourseSemester(e.target.value)}
                        className="h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none"
                      >
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="3">Summer / Trimester 3</option>
                      </select>
                      <Input
                        type="number"
                        aria-label="Academic Year"
                        placeholder="Year"
                        value={newCourseYear}
                        onChange={(e) => setNewCourseYear(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Colour</Label>
                    <div className="col-span-3 flex flex-wrap gap-2 pt-1">
                      {COURSE_COLORS.map((c) => {
                        const isSelected = c.hex.toLowerCase() === newCourseColor.toLowerCase();
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            className={cn(
                              'w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer',
                              isSelected
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm'
                                : 'hover:scale-105 opacity-85 hover:opacity-100'
                            )}
                            style={{ backgroundColor: c.hex }}
                            onClick={() => setNewCourseColor(c.hex)}
                            title={c.name}
                            aria-label={`Select ${c.name}`}
                          >
                            {isSelected ? <Check size={14} className="text-white" strokeWidth={3} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleAddCourse} className="cursor-pointer">
                    Create Course
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 4-Metric Course Telemetry Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Active Modules</div>
              <div className="font-mono text-xl font-bold text-foreground tabular-nums mt-0.5">{activeCourses.length}</div>
            </div>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Lecture Decks</div>
              <div className="font-mono text-xl font-bold text-foreground tabular-nums mt-0.5">{totalActiveLectures}</div>
            </div>
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Past Paper Banks</div>
              <div className="font-mono text-xl font-bold text-foreground tabular-nums mt-0.5">{totalActivePapers}</div>
            </div>
            <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <button
            type="button"
            onClick={() => switchView(activeView === 'archived' ? 'active' : 'archived')}
            className="text-left rounded-xl border border-border/70 bg-muted/25 hover:border-primary/40 px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Archived Vault</div>
              <div className="font-mono text-xl font-bold text-foreground tabular-nums mt-0.5">{archivedCourses.length}</div>
            </div>
            <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </button>
        </div>

        {/* Workspace Tab Switcher + Search/Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1 self-start">
            <button
              type="button"
              onClick={() => switchView('active')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                activeView === 'active'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Active Courses ({activeCourses.length})
            </button>
            <button
              type="button"
              onClick={() => switchView('archived')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                activeView === 'archived'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Archive className="w-3.5 h-3.5 text-amber-500" />
              Archived Vault ({archivedCourses.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code or course title..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            {semesterOptions.length > 0 ? (
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                aria-label="Filter by semester"
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">All Semesters</option>
                {semesterOptions.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sort courses"
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="most_lectures">Most Lectures</option>
              <option value="alphabetical">A - Z Code</option>
            </select>

            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={cn(
                  'p-1.5 rounded-md transition-colors cursor-pointer',
                  viewMode === 'grid' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
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
                  viewMode === 'list' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
            <DialogDescription>Update module code, title, term, and accent colour.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">Course Code</Label>
              <Input
                id="edit-code"
                placeholder="e.g. CS101"
                className="col-span-3"
                value={editCourseCode}
                onChange={(e) => setEditCourseCode(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Course Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g. Intro to CS"
                className="col-span-3"
                value={editCourseName}
                onChange={(e) => setEditCourseName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-semester" className="text-right">Term</Label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                <select
                  id="edit-semester"
                  value={editCourseSemester}
                  onChange={(e) => setEditCourseSemester(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Summer / Trimester 3</option>
                </select>
                <Input
                  type="number"
                  aria-label="Edit Academic Year"
                  value={editCourseYear}
                  onChange={(e) => setEditCourseYear(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Colour</Label>
              <div className="col-span-3 flex flex-wrap gap-2 pt-1">
                {COURSE_COLORS.map((c) => {
                  const isSelected = c.hex.toLowerCase() === editCourseColor.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      className={cn(
                        'w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer',
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      )}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setEditCourseColor(c.hex)}
                      title={c.name}
                      aria-label={`Select ${c.name}`}
                    >
                      {isSelected ? <Check size={14} className="text-white" strokeWidth={3} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleUpdateCourse} className="cursor-pointer">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Notice */}
      {errorMsg ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>Could not refresh course list: {errorMsg}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchCourses()} className="cursor-pointer">
            Retry
          </Button>
        </div>
      ) : null}

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-60 rounded-2xl" />
          ))}
        </div>
      ) : activeView === 'archived' ? (
        /* ARCHIVED VAULT VIEW (always rich and structured, even at 0 archived courses) */
        <section id="archived" className="space-y-5 scroll-mt-6">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-foreground">Archived Courses Vault</h2>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Completed modules stay safely stored here with all uploaded slides, flashcards, quizzes, and graded past papers intact. Restore any module back to Active Courses in one click.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => switchView('active')}
              className="shrink-0 text-xs cursor-pointer"
            >
              Back to Active Courses
            </Button>
          </div>

          {displayedList.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Archive className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">
                      {archivedCourses.length === 0
                        ? 'No courses archived yet'
                        : 'No archived courses match your filter'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-lg">
                      {archivedCourses.length === 0
                        ? 'When a semester finishes, click the Archive icon on any active course card to declutter your active study desk without deleting your notes.'
                        : 'Clear your search query or semester filter to view archived modules.'}
                    </p>
                  </div>
                </div>

                {archivedCourses.length === 0 ? (
                  <Button
                    type="button"
                    onClick={() => switchView('active')}
                    className="bg-[#5B2D8E] dark:bg-primary hover:bg-[#492274] text-white shrink-0 cursor-pointer"
                  >
                    Manage Active Courses
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSemesterFilter('all');
                    }}
                    className="shrink-0 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-1.5">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                    01 / FOCUS CURRENT TERM
                  </div>
                  <div className="text-sm font-semibold text-foreground">Keep active list clean</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Archive finished modules so your Dashboard Command Center and Timetable stay focused on this semester&apos;s exams.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-1.5">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                    02 / ZERO DATA LOSS
                  </div>
                  <div className="text-sm font-semibold text-foreground">Notes &amp; past papers preserved</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Every slide explanation, SM-2 flashcard deck, and AI past-paper attempt remains safely attached to the archived module.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-1.5">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                    03 / INSTANT RESTORE
                  </div>
                  <div className="text-sm font-semibold text-foreground">Re-activate anytime</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Need to revise a prerequisite before finals? Restore any archived course back into Active Courses with one click.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-3'
              )}
            >
              {displayedList.map((course) => {
                const lecCount = course.lectures?.length || 0;
                const paperCount = course.past_papers?.length || 0;
                const accent = resolveCourseColor(course.colour || undefined);

                return (
                  <article
                    key={course.id}
                    className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 hover:bg-card hover:border-primary/40 p-5 transition-all"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {course.course_code || 'COURSE'}
                          </span>
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-300">
                            ARCHIVED
                          </span>
                        </div>
                        <Link
                          href={`/dashboard/courses/${course.id}`}
                          className="mt-1 block text-lg font-bold text-foreground hover:text-primary transition-colors truncate cursor-pointer"
                        >
                          {course.title || 'Untitled'}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1">
                          Sem {course.semester || 1} · {course.year || new Date().getFullYear()} · {lecCount} lectures · {paperCount} papers
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleArchiveCourse(e, course.id, true)}
                          title="Restore Course"
                          className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5 text-primary" />
                          Restore
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => deleteCourse(e, course.id)}
                          title="Delete Course Permanently"
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : displayedList.length === 0 ? (
        /* ACTIVE COURSES EMPTY STATE */
        <section className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">
                  {activeCourses.length === 0
                    ? 'Build your first course workspace'
                    : 'No active courses match your current filters'}
                </h2>
                <p className="text-sm text-muted-foreground max-w-lg">
                  {activeCourses.length === 0
                    ? 'Create a course for each module you are taking this semester to organize lecture slides, generate SM-2 flashcards, take quizzes, and practice past papers.'
                    : 'Clear your search or semester filter to view all active courses.'}
                </p>
              </div>
            </div>

            {activeCourses.length === 0 ? (
              <Button
                type="button"
                onClick={() => handleCourseDialogChange(true)}
                className="bg-[#5B2D8E] dark:bg-primary hover:bg-[#492274] text-white shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Course
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSemesterFilter('all');
                }}
                className="shrink-0 cursor-pointer"
              >
                Reset Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-1.5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                01 / LECTURE SLIDES
              </div>
              <div className="text-sm font-semibold text-foreground">Upload PDFs &amp; get AI tutor notes</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every slide deck is indexed for semantic search, audio explanations, cheat sheets, and in-slide Q&amp;A.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-1.5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                02 / ACTIVE RECALL
              </div>
              <div className="text-sm font-semibold text-foreground">Auto-generated cards &amp; quizzes</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Practice SM-2 spaced repetition flashcards and lecture quizzes grounded directly in your course materials.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-1.5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                03 / STEM TOOLKIT
              </div>
              <div className="text-sm font-semibold text-foreground">Integrated Math &amp; Graph Studio</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Jump straight to the{' '}
                <Link href="/dashboard/calculator?tab=solver" className="text-primary hover:underline font-medium">
                  Math Solver
                </Link>{' '}
                or{' '}
                <Link href="/dashboard/calculator?tab=graph" className="text-primary hover:underline font-medium">
                  Graph Plotter
                </Link>{' '}
                for assignments and coordinate questions.
              </p>
            </div>
          </div>
        </section>
      ) : (
        /* ACTIVE COURSES POPULATED GRID / LIST */
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}
        >
          {displayedList.map((course) => {
            const lectures = course.lectures || [];
            const papers = course.past_papers || [];
            const accentColor = resolveCourseColor(course.colour || undefined);

            if (viewMode === 'list') {
              return (
                <article
                  key={course.id}
                  onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                  className="group relative overflow-hidden rounded-xl border border-border/80 bg-card hover:border-primary/45 p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />
                  <div className="pl-2 min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                        {course.course_code || 'COURSE'}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Sem {course.semester || 1} · {course.year || new Date().getFullYear()}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {course.title || 'Untitled'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums px-2">
                      {lectures.length} decks · {papers.length} papers
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => router.push(`/dashboard/courses/${course.id}/flashcards`)}
                    >
                      Cards
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => router.push(`/dashboard/courses/${course.id}/quiz`)}
                    >
                      Quiz
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => {
                        setActiveCourseId(course.id);
                        setIsUploadDialogOpen(true);
                      }}
                    >
                      Upload
                    </Button>
                    <button
                      type="button"
                      onClick={(e) => openEditDialog(e, course)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="Edit Course"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleArchiveCourse(e, course.id, !!course.is_archived)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="Archive Course"
                    >
                      <Archive size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteCourse(e, course.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Delete Course"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            }

            return (
              <article
                key={course.id}
                onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-primary/45 p-5 shadow-xs transition-all cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: accentColor }} />

                <div className="space-y-3.5 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {course.course_code || 'COURSE'}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Sem {course.semester || 1} · {course.year || new Date().getFullYear()}
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {course.title || 'Untitled'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => openEditDialog(e, course)}
                        className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Edit Course"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleArchiveCourse(e, course.id, !!course.is_archived)}
                        className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Archive Course"
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => deleteCourse(e, course.id)}
                        className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-white transition-colors cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Course Content Summary */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      {lectures.length} {lectures.length === 1 ? 'lecture' : 'lectures'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                      {papers.length} {papers.length === 1 ? 'past paper' : 'past papers'}
                    </span>
                  </div>

                  {/* Recent Lectures Quick Preview */}
                  <div className="rounded-xl border border-border/60 bg-muted/25 p-2.5 space-y-1.5 min-h-[72px]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                      <span>Recent Lectures</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/dashboard/lectures?courseId=${course.id}`);
                        }}
                        className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                      >
                        All Decks &rarr;
                      </button>
                    </div>
                    {lectures.length === 0 ? (
                      <div className="text-xs text-muted-foreground flex items-center justify-between pt-0.5">
                        <span>No PDF decks uploaded yet</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveCourseId(course.id);
                            setIsUploadDialogOpen(true);
                          }}
                          className="text-primary font-semibold hover:underline cursor-pointer"
                        >
                          Upload PDF
                        </button>
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {lectures.slice(0, 2).map((lec) => (
                          <li key={lec.id}>
                            <Link
                              href={`/dashboard/courses/${course.id}/lectures/${lec.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-between gap-2 text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                            >
                              <span className="truncate">{lec.title || 'Untitled Lecture'}</span>
                              <ArrowRight className="w-3 h-3 shrink-0 opacity-60" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Bottom-aligned 4-action quick strip */}
                <div
                  className="mt-4 pt-3 border-t border-border/60 grid grid-cols-4 gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] px-1.5 gap-1 cursor-pointer"
                    onClick={() => router.push(`/dashboard/courses/${course.id}/flashcards`)}
                  >
                    <BrainCircuit size={13} /> Cards
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] px-1.5 gap-1 cursor-pointer"
                    onClick={() => router.push(`/dashboard/courses/${course.id}/quiz`)}
                  >
                    <BookOpen size={13} /> Quiz
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] px-1.5 gap-1 cursor-pointer"
                    onClick={() => router.push(`/dashboard/courses/${course.id}/past-papers`)}
                  >
                    <FileCheck2 size={13} /> Papers
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] px-1.5 gap-1 cursor-pointer"
                    onClick={() => {
                      setActiveCourseId(course.id);
                      setIsUploadDialogOpen(true);
                    }}
                  >
                    <UploadCloud size={13} /> Upload
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Upload Lecture Dialog */}
      {activeCourseId ? (
        <UploadLectureDialog
          courseId={activeCourseId}
          courseCode={courses.find((c) => c.id === activeCourseId)?.course_code || 'COURSE'}
          open={isUploadDialogOpen}
          onOpenChange={(open) => {
            setIsUploadDialogOpen(open);
            if (!open) setActiveCourseId(null);
          }}
          onSuccess={fetchCourses}
        />
      ) : null}
    </div>
  );
}
