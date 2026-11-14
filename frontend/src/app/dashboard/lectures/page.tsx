'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resolveCourseColor } from '@/lib/constants/courses';
import { cn } from '@/lib/utils';
import { UploadLectureDialog } from '@/components/courses/UploadLectureDialog';

interface LectureItem {
  id: string;
  title: string;
  week?: number | null;
  slide_count?: number | null;
  created_at?: string | null;
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

export default function LecturesHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCourseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | 'all'>(urlCourseId || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch courses and their lectures
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch('/api/courses');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const activeOnly = data.filter((c: CourseItem) => !c.is_archived);
            setCourses(activeOnly);
            if (urlCourseId && activeOnly.some((c: CourseItem) => c.id === urlCourseId)) {
              setSelectedCourseId(urlCourseId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load courses for lectures hub', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, [urlCourseId]);

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

    // Sort newest first
    return list.sort((a, b) => {
      const tA = a.lecture.created_at ? new Date(a.lecture.created_at).getTime() : 0;
      const tB = b.lecture.created_at ? new Date(b.lecture.created_at).getTime() : 0;
      return tB - tA;
    });
  }, [courses]);

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

  const totalLectureCount = allLecturesWithCourse.length;

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-6">
      {/* Studio Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/dashboard/courses"
              className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold hover:underline"
            >
              Courses
            </Link>
            <span aria-hidden="true">/</span>
            <span>Study Decks &amp; Lectures</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-primary" strokeWidth={1.75} />
            Lectures &amp; Slide Decks
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Select what course you want to study, resume your latest deck, or review slides with the AI Tutor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeCourse ? (
            <UploadLectureDialog
              courseId={activeCourse.id}
              courseCode={activeCourse.course_code || 'COURSE'}
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
            onClick={() => setSelectedCourseId('all')}
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
                onClick={() => setSelectedCourseId(course.id)}
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

            <div className="flex items-center gap-2">
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
                href={`/dashboard/courses/${activeCourse.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 text-xs font-semibold transition-colors"
              >
                Course Workspace
                <ArrowRight className="w-3 h-3" />
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
              />
            ) : courses.length > 0 ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedCourseId(courses[0].id)}
                className="bg-primary text-primary-foreground text-xs"
              >
                Select {courses[0].course_code || courses[0].title}
              </Button>
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
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-mono uppercase tracking-wider font-semibold">
              Showing {filteredLectures.length}{' '}
              {filteredLectures.length === 1 ? 'Lecture Deck' : 'Lecture Decks'}
            </span>
            <span className="text-[11px]">Click any deck to open the interactive slide viewer</span>
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

              return (
                <article
                  key={lecture.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md p-5 transition-all overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div className="space-y-3 pt-1">
                    {/* Course Code & Metadata Top Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
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
                    <div>
                      <Link
                        href={`/dashboard/courses/${course.id}/lectures/${lecture.id}`}
                        className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
                      >
                        {lecture.title || 'Untitled Lecture'}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {course.title}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        {lecture.slide_count || 0} slides
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        Interactive AI
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/courses/${course.id}/lectures/${lecture.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Study Slides
                    </Link>

                    <Link
                      href={`/dashboard/courses/${course.id}/flashcards`}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted p-2 text-xs text-foreground transition-colors cursor-pointer"
                      title="Course Flashcards"
                    >
                      <BrainCircuit className="w-4 h-4 text-primary" />
                    </Link>

                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted p-2 text-xs text-foreground transition-colors cursor-pointer"
                      title="Course Hub"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
