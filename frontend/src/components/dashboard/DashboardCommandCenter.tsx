'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calculator,
  Calendar as CalendarIcon,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck2,
  FileText,
  FolderPlus,
  Layers,
  PlayCircle,
  Search,
  TrendingUp,
  PlaySquare,
  Coins,
} from 'lucide-react';
import { resolveCourseColor } from '@/lib/constants/courses';
import { DailyMotivationalQuote } from '@/components/DailyMotivationalQuote';
import { ExamCountdownList } from '@/components/ExamCountdownList';
import { ExamScheduler } from '@/components/ExamScheduler';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DashboardCourseItem {
  id: string;
  title: string;
  course_code: string | null;
  colour: string | null;
  semester: string | null;
  year: number | null;
  lectureCount: number;
  totalSlides: number;
  dueCards: number;
  totalCards: number;
  latestLectureId: string | null;
  latestLectureTitle: string | null;
}

export interface DashboardResumeItem {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseColour: string | null;
  lectureId: string;
  lectureTitle: string;
  slideNumber: number;
  slideCount: number;
  updatedAt: string | null;
}

export interface DashboardDueQueueItem {
  lectureId: string;
  lectureTitle: string;
  courseId: string;
  courseCode: string;
  dueCount: number;
}

export interface DashboardAssessmentItem {
  id: string;
  kind: 'past_paper' | 'quiz';
  title: string;
  subtitle: string;
  scorePercent: number | null;
  completedAt: string | null;
  href: string;
}

export interface DashboardCalendarItem {
  id: string;
  title: string;
  date: string;
  type: 'exam' | 'assignment' | 'session';
  time?: string;
  course_id?: string | null;
}

export interface DashboardPinnedVideoItem {
  id: string;
  video_id: string;
  title: string;
  channel: string | null;
  watched: boolean;
}

export interface DashboardHeatmapCell {
  dateKey: string;
  label: string;
  points: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface DashboardCommandCenterProps {
  greeting: string;
  firstName: string;
  academicSubtitle: string | null;
  todayLabel: string;
  creditBalance: number;
  weeklyMinutes: number;
  weeklySessions: number;
  dueFlashcards: number;
  totalFlashcards: number;
  avgScorePercent: number | null;
  assessmentCount: number;
  courses: DashboardCourseItem[];
  resumeItem: DashboardResumeItem | null;
  dueQueue: DashboardDueQueueItem[];
  recentAssessments: DashboardAssessmentItem[];
  upcomingEvents: DashboardCalendarItem[];
  pinnedVideos: DashboardPinnedVideoItem[];
  heatmapCells: DashboardHeatmapCell[];
  activeDaysLast28: number;
}

type CourseFilterTab = 'all' | 'due' | 'with_lectures';

const TOOL_DOCK = [
  {
    label: 'Math & Graph',
    hint: 'CAS + Plotter',
    href: '/dashboard/calculator',
    icon: Calculator,
  },
  {
    label: 'Notes Scanner',
    hint: 'Handwriting OCR',
    href: '/dashboard/scanner',
    icon: Camera,
  },
  {
    label: 'Essay Grader',
    hint: 'Rubric & Draft',
    href: '/dashboard/essay-grader',
    icon: FileText,
  },
  {
    label: 'Past Papers',
    hint: 'AI Examiner',
    href: '/dashboard/past-papers',
    icon: FileCheck2,
  },
  {
    label: 'YouTube Study',
    hint: 'Video Notes',
    href: '/dashboard/youtube',
    icon: PlaySquare,
  },
  {
    label: 'Smart Search',
    hint: 'Across Slides',
    href: '/dashboard/search',
    icon: Search,
  },
] as const;

function formatShortDate(iso: string | null): string {
  if (!iso) return 'Recent';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatStudyHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function DashboardCommandCenter(props: DashboardCommandCenterProps) {
  const {
    greeting,
    firstName,
    academicSubtitle,
    todayLabel,
    creditBalance,
    weeklyMinutes,
    weeklySessions,
    dueFlashcards,
    totalFlashcards,
    avgScorePercent,
    assessmentCount,
    courses,
    resumeItem,
    dueQueue,
    recentAssessments,
    upcomingEvents,
    pinnedVideos,
    heatmapCells,
    activeDaysLast28,
  } = props;

  const [courseFilter, setCourseFilter] = useState<CourseFilterTab>('all');

  const upcomingExams = useMemo(
    () => upcomingEvents.filter((event) => event.type === 'exam'),
    [upcomingEvents]
  );

  const otherEvents = useMemo(
    () => upcomingEvents.filter((event) => event.type !== 'exam'),
    [upcomingEvents]
  );

  const nearestExam = useMemo(() => {
    if (upcomingExams.length === 0) return null;
    const first = upcomingExams[0];
    const target = new Date(`${first.date}T00:00:00`);
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.max(0, Math.ceil((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)));
    return { title: first.title, daysLeft: diffDays };
  }, [upcomingExams]);

  const filteredCourses = useMemo(() => {
    if (courseFilter === 'due') {
      return courses.filter((c) => c.dueCards > 0);
    }
    if (courseFilter === 'with_lectures') {
      return courses.filter((c) => c.lectureCount > 0);
    }
    return courses;
  }, [courses, courseFilter]);

  const coursesWithDueCount = useMemo(
    () => courses.filter((c) => c.dueCards > 0).length,
    [courses]
  );

  const primaryReviewHref = useMemo(() => {
    if (dueQueue.length > 0) {
      return `/dashboard/courses/${dueQueue[0].courseId}/flashcards`;
    }
    if (courses.length > 0) {
      return `/dashboard/courses/${courses[0].id}/flashcards`;
    }
    return '/dashboard/courses';
  }, [dueQueue, courses]);

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      {/* Row 1: Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold">
                Study Command Center
              </span>
              <span aria-hidden="true">/</span>
              <span>{todayLabel}</span>
              {academicSubtitle ? (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="truncate max-w-xs">{academicSubtitle}</span>
                </>
              ) : null}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {greeting}, {firstName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted/70 transition-colors cursor-pointer tabular-nums"
            >
              <Coins className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
              <span className="font-mono font-semibold">{creditBalance}</span>
              <span className="text-muted-foreground">credits</span>
            </Link>

            <Link
              href="/dashboard/calendar?view=timetable"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-[0.98]"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
              Timetable
            </Link>

            <Link
              href="/dashboard/courses?action=new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5B2D8E] dark:bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#492274] dark:hover:bg-primary/90 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
              New Course
            </Link>
          </div>
        </div>

        {/* Integrated Compact Quote + Quick-Launch Toolkit */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1 items-stretch">
          <div className="xl:col-span-4 flex flex-col justify-center">
            <DailyMotivationalQuote compact />
          </div>

          <nav aria-label="Study tools quick launch" className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TOOL_DOCK.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex flex-col justify-between rounded-xl border border-border/70 bg-muted/25 hover:bg-muted/60 hover:border-primary/40 p-2.5 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-background border border-border/70 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground leading-tight truncate">{tool.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{tool.hint}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Row 2: 4-Tile KPI Telemetry Strip */}
      <section aria-label="Study metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href={primaryReviewHref}
          className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/45 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px]">Due Review Queue</span>
            <BrainCircuit className="h-4 w-4 text-primary" strokeWidth={1.75} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {dueFlashcards}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              / {totalFlashcards} cards
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground flex items-center justify-between">
            <span>{dueFlashcards > 0 ? 'Ready for SM-2 recall' : 'All cards caught up'}</span>
            <span className="text-primary font-medium group-hover:underline">Review</span>
          </p>
        </Link>

        <Link
          href="/dashboard/analytics#velocity"
          className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/45 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px]">7-Day Focus Time</span>
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatStudyHours(weeklyMinutes)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              across {weeklySessions} {weeklySessions === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground flex items-center justify-between">
            <span>Weekly study log</span>
            <span className="text-primary font-medium group-hover:underline">Velocity</span>
          </p>
        </Link>

        <Link
          href="/dashboard/past-papers"
          className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/45 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px]">Exam Readiness</span>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {avgScorePercent !== null ? `${avgScorePercent}%` : '--'}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {assessmentCount} {assessmentCount === 1 ? 'attempt' : 'attempts'}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground flex items-center justify-between">
            <span>{avgScorePercent !== null ? 'Past papers & quizzes avg' : 'Complete a quiz or paper'}</span>
            <span className="text-primary font-medium group-hover:underline">Practice</span>
          </p>
        </Link>

        <Link
          href="/dashboard/calendar"
          className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/45 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px]">Next Exam</span>
            <CalendarIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {nearestExam ? `${nearestExam.daysLeft}d` : '--'}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {nearestExam ? nearestExam.title : 'No exams queued'}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground flex items-center justify-between">
            <span>{upcomingEvents.length} upcoming agenda {upcomingEvents.length === 1 ? 'item' : 'items'}</span>
            <span className="text-primary font-medium group-hover:underline">Planner</span>
          </p>
        </Link>
      </section>

      {/* Row 3: Asymmetric 12-Col Bento Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Execution Core (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Hero Stream: Resume Studying OR Getting Started */}
          {resumeItem ? (
            <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
              <div
                className="absolute top-0 left-0 bottom-0 w-1.5"
                style={{ backgroundColor: resolveCourseColor(resumeItem.courseColour) }}
              />
              <div className="pl-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-primary">
                      RESUME STUDYING
                    </span>
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      {resumeItem.courseCode}
                    </span>
                    {resumeItem.updatedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Last opened {formatShortDate(resumeItem.updatedAt)}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground truncate">
                    {resumeItem.lectureTitle}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {resumeItem.courseTitle}
                  </p>

                  {resumeItem.slideCount > 0 ? (
                    <div className="pt-1 space-y-1.5 max-w-md">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="text-muted-foreground">
                          Slide <strong className="text-foreground">{resumeItem.slideNumber}</strong> of {resumeItem.slideCount}
                        </span>
                        <span className="font-mono font-semibold text-primary">
                          {Math.min(100, Math.round((resumeItem.slideNumber / resumeItem.slideCount) * 100))}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#5B2D8E] dark:bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((resumeItem.slideNumber / resumeItem.slideCount) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2 shrink-0">
                  <Link
                    href={`/dashboard/courses/${resumeItem.courseId}/lectures/${resumeItem.lectureId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B2D8E] dark:bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#492274] dark:hover:bg-primary/90 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    Continue Deck
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                  <Link
                    href={`/dashboard/courses/${resumeItem.courseId}/quiz`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Quick Course Quiz
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Getting Started
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-foreground mt-1">
                    Build your semester study workspace
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    Add your courses, upload lecture slides, or import past papers to unlock spaced-repetition cards and AI exam feedback.
                  </p>
                </div>
                <Link
                  href="/dashboard/courses?action=new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B2D8E] dark:bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#492274] dark:hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                >
                  <FolderPlus className="h-4 w-4" strokeWidth={1.75} />
                  Create First Course
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link
                  href="/dashboard/courses?action=new"
                  className="rounded-xl border border-border/70 bg-muted/30 p-3.5 hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs font-semibold text-primary mb-1">01 / SYLLABUS &amp; SLIDES</div>
                  <div className="text-sm font-semibold text-foreground">Create a course</div>
                  <p className="text-xs text-muted-foreground mt-1">Upload PDFs to auto-extract flashcards, slide summaries, and practice quizzes.</p>
                </Link>
                <Link
                  href="/dashboard/past-papers?action=upload"
                  className="rounded-xl border border-border/70 bg-muted/30 p-3.5 hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs font-semibold text-primary mb-1">02 / EXAM PREP</div>
                  <div className="text-sm font-semibold text-foreground">Upload past papers</div>
                  <p className="text-xs text-muted-foreground mt-1">Attempt timed papers and receive step-by-step AI examiner marking.</p>
                </Link>
                <Link
                  href="/dashboard/calendar?action=add"
                  className="rounded-xl border border-border/70 bg-muted/30 p-3.5 hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs font-semibold text-primary mb-1">03 / TIMELINE</div>
                  <div className="text-sm font-semibold text-foreground">Schedule exam dates</div>
                  <p className="text-xs text-muted-foreground mt-1">Track countdowns and generate an adaptive weekly revision timetable.</p>
                </Link>
              </div>
            </section>
          )}

          {/* Active Courses Workspace */}
          {courses.length > 0 ? (
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold tracking-tight text-foreground">Course Workspaces</h2>
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                    {courses.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setCourseFilter('all')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                        courseFilter === 'all'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      All ({courses.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseFilter('due')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                        courseFilter === 'due'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Due ({coursesWithDueCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseFilter('with_lectures')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                        courseFilter === 'with_lectures'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Active Decks
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/lectures"
                      className="text-xs font-semibold text-primary hover:underline px-1.5 cursor-pointer"
                    >
                      Recent Lectures
                    </Link>
                    <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                    <Link
                      href="/dashboard/courses"
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground px-1.5 cursor-pointer"
                    >
                      All Courses
                    </Link>
                  </div>
                </div>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  No courses match this filter.{' '}
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setCourseFilter('all')}
                    className="px-1 h-auto text-primary cursor-pointer"
                  >
                    Show all courses
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredCourses.slice(0, 6).map((course) => {
                    const accentColor = resolveCourseColor(course.colour);
                    return (
                      <article
                        key={course.id}
                        className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 hover:bg-background hover:border-primary/40 p-4 transition-all duration-150 overflow-hidden"
                      >
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: accentColor }}
                        />

                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  {course.course_code || 'COURSE'}
                                </span>
                                {course.semester || course.year ? (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {[course.semester, course.year].filter(Boolean).join(' ')}
                                  </span>
                                ) : null}
                              </div>
                              <Link
                                href={`/dashboard/courses/${course.id}`}
                                className="mt-1 block text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                              >
                                {course.title || 'Untitled Course'}
                              </Link>
                            </div>

                            {course.dueCards > 0 ? (
                              <span className="shrink-0 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                                {course.dueCards} due
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
                                {course.lectureCount} {course.lectureCount === 1 ? 'lec' : 'lecs'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                              {course.lectureCount} lectures
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
                              {course.totalSlides} slides
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <BrainCircuit className="h-3.5 w-3.5" strokeWidth={1.75} />
                              {course.totalCards} cards
                            </span>
                          </div>
                        </div>

                        {/* Bottom-aligned consistent quick action row */}
                        <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-4 gap-1.5">
                          <Link
                            href={
                              course.latestLectureId
                                ? `/dashboard/courses/${course.id}/lectures/${course.latestLectureId}`
                                : `/dashboard/courses/${course.id}`
                            }
                            className="inline-flex items-center justify-center rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary py-1.5 text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                          >
                            Slides
                          </Link>
                          <Link
                            href={`/dashboard/courses/${course.id}/flashcards`}
                            className="inline-flex items-center justify-center rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary py-1.5 text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                          >
                            Cards
                          </Link>
                          <Link
                            href={`/dashboard/courses/${course.id}/quiz`}
                            className="inline-flex items-center justify-center rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary py-1.5 text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                          >
                            Quiz
                          </Link>
                          <Link
                            href={`/dashboard/courses/${course.id}/past-papers`}
                            className="inline-flex items-center justify-center rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary py-1.5 text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                          >
                            Papers
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {/* Sub-Bento Split: Due Flashcard Triage + Recent Assessments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spaced Repetition Triage */}
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-foreground">Spaced Repetition Queue</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Decks prioritized by SM-2 recall interval</p>
                </div>
                <BrainCircuit className="h-4 w-4 text-primary" strokeWidth={1.75} />
              </div>

              {dueQueue.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto" strokeWidth={1.75} />
                  <p className="text-xs font-semibold text-foreground">All due flashcards reviewed</p>
                  <p className="text-xs text-muted-foreground">
                    Generate cards inside any lecture deck to schedule your next recall session.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {dueQueue.map((item) => (
                    <li key={item.lectureId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-semibold text-primary truncate">
                          {item.courseCode}
                        </div>
                        <div className="text-sm font-medium text-foreground truncate">{item.lectureTitle}</div>
                      </div>
                      <Link
                        href={`/dashboard/courses/${item.courseId}/flashcards`}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:border-primary/40 hover:bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer tabular-nums"
                      >
                        <span className="font-mono text-amber-600 dark:text-amber-400">{item.dueCount}</span>
                        <span>Review</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent Assessments (Past Papers & Quizzes) */}
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-foreground">Recent Assessments</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Latest past paper &amp; lecture quiz results</p>
                </div>
                <Link href="/dashboard/past-papers" className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                  All papers
                </Link>
              </div>

              {recentAssessments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-2">
                  <Compass className="h-5 w-5 text-muted-foreground mx-auto" strokeWidth={1.75} />
                  <p className="text-xs font-semibold text-foreground">No graded attempts yet</p>
                  <Link
                    href="/dashboard/past-papers"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Start a past paper
                    <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recentAssessments.map((item) => {
                    const scoreColor =
                      item.scorePercent === null
                        ? 'bg-muted text-muted-foreground'
                        : item.scorePercent >= 70
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : item.scorePercent >= 50
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300';

                    return (
                      <li key={`${item.kind}-${item.id}`} className="py-2.5 first:pt-0 last:pb-0">
                        <Link
                          href={item.href}
                          className="group flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.subtitle} · {formatShortDate(item.completedAt)}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold tabular-nums',
                              scoreColor
                            )}
                          >
                            {item.scorePercent !== null ? `${Math.round(item.scorePercent)}%` : 'Pending'}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* Right Intelligence Rail (4 cols) */}
        <aside className="lg:col-span-4 space-y-5">
          {/* 28-Day Habit Consistency Matrix */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">28-Day Study Pulse</h2>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {activeDaysLast28} of 28 active days
                </p>
              </div>
              <Link
                href="/dashboard/analytics#heatmap"
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Full analytics
              </Link>
            </div>

            <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="28-day study activity">
              {heatmapCells.map((cell) => {
                const levelClasses =
                  cell.level === 0
                    ? 'bg-muted/70 border border-border/40'
                    : cell.level === 1
                    ? 'bg-[#E9D5FF] dark:bg-[#3B1861]'
                    : cell.level === 2
                    ? 'bg-[#C084FC] dark:bg-[#5B2D8E]'
                    : cell.level === 3
                    ? 'bg-[#9333EA] dark:bg-[#7C3AED]'
                    : 'bg-[#5B2D8E] dark:bg-[#A855F7]';
                return (
                  <div
                    key={cell.dateKey}
                    title={`${cell.label}: ${cell.points} study pts`}
                    className={cn('h-6 rounded-md transition-transform hover:scale-105', levelClasses)}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>4 weeks ago</span>
              <div className="flex items-center gap-1">
                <span>Less</span>
                <span className="h-2.5 w-2.5 rounded-xs bg-muted/70 border border-border/40" />
                <span className="h-2.5 w-2.5 rounded-xs bg-[#E9D5FF] dark:bg-[#3B1861]" />
                <span className="h-2.5 w-2.5 rounded-xs bg-[#9333EA] dark:bg-[#7C3AED]" />
                <span className="h-2.5 w-2.5 rounded-xs bg-[#5B2D8E] dark:bg-[#A855F7]" />
                <span>More</span>
              </div>
            </div>
          </section>

          {/* Upcoming Exams & Study Agenda */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-foreground">Exams &amp; Deadlines</h2>
              <Link
                href="/dashboard/calendar?view=timetable"
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Timetable
              </Link>
            </div>

            <ExamCountdownList exams={upcomingExams} courses={courses.map((c) => ({ id: c.id, title: c.title, course_code: c.course_code || '' }))} />

            {otherEvents.length > 0 ? (
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  Upcoming Sessions &amp; Tasks
                </div>
                <ul className="space-y-1.5">
                  {otherEvents.slice(0, 3).map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/35 px-2.5 py-2 text-xs"
                    >
                      <span className="font-medium text-foreground truncate">{ev.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {formatShortDate(ev.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ExamScheduler />
          </section>

          {/* Pinned YouTube Study Queue */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">YouTube Watch Queue</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Pinned lectures awaiting review</p>
              </div>
              <Link href="/dashboard/youtube" className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                Explore
              </Link>
            </div>

            {pinnedVideos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-1.5">
                <PlaySquare className="h-5 w-5 text-muted-foreground mx-auto" strokeWidth={1.75} />
                <p className="text-xs text-muted-foreground">
                  No pinned videos yet. Save topic tutorials in YouTube Study to take timestamped notes.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {pinnedVideos.map((vid) => (
                  <li key={vid.id}>
                    <Link
                      href={`/dashboard/youtube/watch/${vid.video_id}`}
                      className="group flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/25 hover:bg-muted/60 hover:border-primary/40 p-2.5 transition-colors cursor-pointer"
                    >
                      <PlayCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" strokeWidth={1.75} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary line-clamp-2 leading-snug">
                          {vid.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="truncate">{vid.channel || 'YouTube'}</span>
                          <span>·</span>
                          <span>{vid.watched ? 'Watched' : 'Unwatched'}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

