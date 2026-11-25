'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Layers,
  BrainCircuit,
  FileCheck2,
  ChevronRight,
  ArrowRight,
  Plus,
  Play,
  Clock,
  MessageSquare,
  HelpCircle,
  Calendar,
  GraduationCap,
  DownloadCloud,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SPRING_SNAPPY, useAppReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { resolveCourseColor } from '@/lib/constants/courses';
import { UploadLectureDialog } from '@/components/courses/UploadLectureDialog';
import { CourseUploadPastPaperButton } from '@/components/past-papers/CourseUploadPastPaperButton';
import { CollegiateLibraryIllustration, FlashcardStackIllustration, ExamArchiveIllustration } from '@/components/illustrations';
import { cn } from '@/lib/utils';
import { normalizePastPaperTitle, resolveDisplayCourseCode } from '@/lib/past-papers/titleNormalizer';

interface CourseData {
  id: string;
  course_code: string | null;
  title: string;
  description?: string | null;
  semester?: number | string | null;
  year?: number | null;
  colour?: string | null;
  created_at?: string | null;
}

interface LectureItem {
  id: string;
  title: string;
  week?: number | null;
  slide_count?: number | null;
  created_at?: string | null;
  processing?: boolean | null;
  cover_image_url?: string | null;
}

interface PastPaperItem {
  id: string;
  course_id?: string | null;
  course_code?: string | null;
  title?: string | null;
  year?: number | null;
  exam_type?: string | null;
  created_at?: string | null;
}

interface FlashcardItem {
  id: string;
  lecture_id: string;
  next_review: string;
}

type TabType = 'modules' | 'past-papers' | 'flashcards' | 'tutoring';

export default function CanvasCourseWorkspacePage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params?.courseId || '';

  const initialTab = (searchParams.get('tab') as TabType) || 'modules';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const reducedMotion = useAppReducedMotion();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaperItem[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCourseWorkspace = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);

    try {
      const supabase = createClient();

      const [courseRes, lecturesRes, flashcardsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
        supabase.from('lectures').select('id, title, week, slide_count, created_at, processing, cover_image_url').eq('course_id', courseId).order('week', { ascending: true }),
        supabase.from('flashcards').select('id, lecture_id, next_review').eq('course_id', courseId),
      ]);

      if (courseRes.data) {
        setCourse(courseRes.data as CourseData);
      }

      const lecs = (lecturesRes.data || []) as LectureItem[];
      setLectures(lecs);
      setFlashcards((flashcardsRes.data || []) as FlashcardItem[]);

      // Load past papers
      const normalizedCode = courseRes.data?.course_code
        ? courseRes.data.course_code.toUpperCase().replace(/[^A-Z0-9]/g, '')
        : null;

      let papersQuery = supabase.from('past_papers').select('*');
      if (normalizedCode) {
        papersQuery = papersQuery.or(`course_id.eq.${courseId},normalized_course_code.eq.${normalizedCode}`);
      } else {
        papersQuery = papersQuery.eq('course_id', courseId);
      }
      const { data: papersData } = await papersQuery.order('year', { ascending: false });
      setPastPapers((papersData || []) as PastPaperItem[]);
    } catch (err) {
      console.error('Failed to load course workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadCourseWorkspace();
  }, [loadCourseWorkspace]);

  const dueFlashcardsCount = useMemo(() => {
    const now = new Date();
    return flashcards.filter((f) => new Date(f.next_review) <= now).length;
  }, [flashcards]);

  const totalSlidesCount = useMemo(() => {
    return lectures.reduce((acc, l) => acc + (l.slide_count || 0), 0);
  }, [lectures]);

  const accentColor = resolveCourseColor(course?.colour);

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-6">
      {/* Breadcrumb Nav */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <Link href="/dashboard/courses" className="hover:text-foreground transition-colors">
          Courses
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="font-mono font-semibold text-foreground">
          {course?.course_code || 'Course Workspace'}
        </span>
      </nav>

      {/* Canvas Academic Course Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xs space-y-5">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: accentColor }}
        />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-[#00004E] text-[#D89A06] dark:bg-white/10 dark:text-[#D89A06] border border-[#D89A06]/30 uppercase tracking-wider">
                {course?.course_code || 'COURSE'}
              </span>
              {course?.semester || course?.year ? (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                  {[course?.semester, course?.year].filter(Boolean).join(' · ')}
                </span>
              ) : null}
              <span className="text-xs font-medium text-muted-foreground">
                3 Academic Units
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#00004E] dark:text-white">
              {course?.title || 'Course Workspace'}
            </h1>
            {course?.description ? (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {course.description}
              </p>
            ) : null}
          </div>

          {/* Quick Academic Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {course ? (
              <UploadLectureDialog
                courseId={course.id}
                courseCode={course.course_code || 'COURSE'}
                onSuccess={loadCourseWorkspace}
                trigger={
                  <Button className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] text-xs font-bold px-4 h-9 shadow-xs cursor-pointer">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Upload Lecture Deck
                  </Button>
                }
              />
            ) : null}

            {course ? (
              <CourseUploadPastPaperButton
                courseId={course.id}
              />
            ) : null}

            <Link
              href={`/dashboard/courses/${courseId}/quiz`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              Quizzes
            </Link>

            <Link
              href={`/dashboard/courses/${courseId}/discussion`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              Discussions
            </Link>

            <Link
              href={`/dashboard/chat?courseId=${courseId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted px-3.5 py-2 text-xs font-bold text-foreground transition-colors cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#D89A06]" />
              Course Tutor
            </Link>
          </div>
        </div>

        {/* Academic Stat Line */}
        <div className="pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="w-4 h-4 text-[#D89A06]" />
            <span>
              <strong className="text-foreground font-mono font-bold">{lectures.length}</strong> Lecture Modules
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4 text-[#D89A06]" />
            <span>
              <strong className="text-foreground font-mono font-bold">{totalSlidesCount}</strong> Slides Indexed
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck2 className="w-4 h-4 text-[#D89A06]" />
            <span>
              <strong className="text-foreground font-mono font-bold">{pastPapers.length}</strong> Past Exams
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BrainCircuit className="w-4 h-4 text-[#D89A06]" />
            <span>
              <strong className="text-foreground font-mono font-bold">{dueFlashcardsCount}</strong> Cards Due Review
            </span>
          </div>
        </div>
      </header>

      {/* Canvas LMS Underline Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/80">
        {(
          [
            { id: 'modules', label: `Lecture Decks (${lectures.length})`, icon: BookOpen },
            { id: 'past-papers', label: `Past Papers (${pastPapers.length})`, icon: FileCheck2 },
            { id: 'flashcards', label: `Flashcards (${flashcards.length})`, icon: BrainCircuit },
            { id: 'tutoring', label: 'Course Tutor', icon: GraduationCap },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative inline-flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#D89A06]' : 'text-muted-foreground')} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="course-hub-active-tab"
                  transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#D89A06]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Modules & Sequential Syllabus View (Canvas Standard) */}
      {activeTab === 'modules' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Course Syllabus &amp; Lecture Decks</h2>
              <p className="text-xs text-muted-foreground">
                Sequential week-by-week curriculum. Click any deck to launch the slide viewer with AI notes.
              </p>
            </div>
            {course ? (
              <UploadLectureDialog
                courseId={course.id}
                courseCode={course.course_code || 'COURSE'}
                onSuccess={loadCourseWorkspace}
              />
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : lectures.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-12 text-center space-y-5 shadow-xs flex flex-col items-center">
              <CollegiateLibraryIllustration className="w-56 h-36" />
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-foreground">
                  No Lecture Modules Uploaded Yet
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Upload PDF presentation slides to automatically extract syllabus chapters, generate flashcards, and activate AI slide tutoring.
                </p>
              </div>
              {course ? (
                <UploadLectureDialog
                  courseId={course.id}
                  courseCode={course.course_code || 'COURSE'}
                  onSuccess={loadCourseWorkspace}
                />
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {lectures.map((lec, index) => {
                const weekNum = lec.week || index + 1;
                return (
                  <article
                    key={lec.id}
                    className="group rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs hover:border-[#D89A06] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      {lec.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={lec.cover_image_url}
                          alt={lec.title}
                          className="w-20 h-12 rounded-xl object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#00004E] text-[#D89A06] dark:bg-white/10 dark:text-[#D89A06] border border-[#D89A06]/30 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-mono font-bold uppercase">WK</span>
                          <span className="text-sm font-mono font-black">{String(weekNum).padStart(2, '0')}</span>
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-[#D89A06] uppercase">
                            MODULE {weekNum}
                          </span>
                          <span className="text-muted-foreground text-xs" aria-hidden="true">·</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {lec.slide_count || 0} slides
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {lec.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/dashboard/courses/${courseId}/lectures/${lec.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Open Slide Deck
                      </Link>
                      <Link
                        href={`/dashboard/courses/${courseId}/flashcards`}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <BrainCircuit className="w-3.5 h-3.5 text-[#D89A06]" />
                        Flashcards
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Tab Content 2: Past Examination Papers Specimen View */}
      {activeTab === 'past-papers' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Official Examination Papers</h2>
              <p className="text-xs text-muted-foreground">
                Past examination specimens extracted for timed mock drills and AI Examiner grading.
              </p>
            </div>
            {course ? (
              <CourseUploadPastPaperButton
                courseId={course.id}
              />
            ) : null}
          </div>

          {pastPapers.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-12 text-center space-y-5 shadow-xs flex flex-col items-center">
              <ExamArchiveIllustration className="w-56 h-36" />
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-foreground">
                  No Past Papers Uploaded for this Course
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Upload past examination papers to simulate timed 120-minute exam conditions with model answer grading.
                </p>
              </div>
              {course ? (
                <CourseUploadPastPaperButton
                  courseId={course.id}
                />
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastPapers.map((paper) => {
                const displayTitle = normalizePastPaperTitle(
                  paper.title || `${course?.course_code || 'EXAM'} ${paper.year || ''}`
                );
                return (
                  <article
                    key={paper.id}
                    className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-[#D89A06] transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#D89A06] bg-[#FEF8E7] dark:bg-white/5 px-2 py-0.5 rounded border border-[#D89A06]/30">
                          {paper.year ? `${paper.year} Examination` : 'Official Paper'}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {paper.exam_type || 'Main Paper'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground line-clamp-2">
                        {displayTitle}
                      </h3>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Section A (MCQs) &amp; Section B (Theory)
                      </span>
                      <Link
                        href={`/dashboard/past-papers/${encodeURIComponent(paper.id)}?courseId=${encodeURIComponent(courseId)}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Open Exam Paper
                        <ArrowRight className="w-3.5 h-3.5 text-[#D89A06] dark:text-[#00004E]" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Tab Content 3: Spaced Repetition Flashcards */}
      {activeTab === 'flashcards' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Course Spaced Repetition Decks</h2>
              <p className="text-xs text-muted-foreground">
                SM-2 cognitive mastery flashcards extracted from lecture slides.
              </p>
            </div>
            <Link
              href={`/dashboard/courses/${courseId}/flashcards`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-[#D89A06] dark:text-[#00004E]" />
              Start Review Session
            </Link>
          </div>

          {flashcards.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-12 text-center space-y-5 shadow-xs flex flex-col items-center">
              <FlashcardStackIllustration className="w-56 h-36" />
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-foreground">
                  No Flashcards Extracted Yet
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Upload lecture decks or open an existing deck to automatically generate cognitive spaced repetition flashcards.
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('modules')}
                className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold px-4 h-9 cursor-pointer"
              >
                View Lecture Decks
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="font-mono text-xs font-bold text-[#D89A06] uppercase tracking-wider">
                  Active Mastery Status
                </span>
                <h3 className="text-xl font-black text-foreground">
                  {dueFlashcardsCount} Cards Due for Review
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total {flashcards.length} cards across all {lectures.length} course lecture decks.
                </p>
              </div>

              <Link
                href={`/dashboard/courses/${courseId}/flashcards`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-6 py-3 text-sm font-bold transition-all shadow-md cursor-pointer shrink-0"
              >
                Launch Spaced Review
                <ArrowRight className="w-4 h-4 text-[#D89A06] dark:text-[#00004E]" />
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {/* Tab Content 4: Course Study Tutor */}
      {activeTab === 'tutoring' ? (
        <section className="rounded-2xl border border-border/80 bg-card p-8 md:p-12 text-center space-y-5 shadow-xs flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00004E] text-[#D89A06] dark:bg-white/10 dark:text-[#D89A06] border border-[#D89A06]/30 flex items-center justify-center shadow-xs">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-lg">
            <h3 className="text-xl font-black text-foreground">
              Course Study Tutor for {course?.course_code || 'This Course'}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask questions about lecture slides, request formula derivations, or practice quiz questions. Answers cite your exact uploaded slide numbers.
            </p>
          </div>
          <Link
            href={`/dashboard/chat?courseId=${courseId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-6 py-3 text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            Open Course Tutor Chat
            <ArrowRight className="w-4 h-4 text-[#D89A06] dark:text-[#00004E]" />
          </Link>
        </section>
      ) : null}
    </div>
  );
}
