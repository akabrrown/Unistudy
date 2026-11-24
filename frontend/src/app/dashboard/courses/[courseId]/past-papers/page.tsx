'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ArrowRight, AlertTriangle, DownloadCloud, ArrowLeft, RefreshCw } from 'lucide-react';
import { CourseUploadPastPaperButton } from '@/components/past-papers/CourseUploadPastPaperButton';
import { DeletePastPaperButton } from '@/components/past-papers/DeletePastPaperButton';
import { EmptyState } from '@/components/ui/empty-state';
import { normalizePastPaperTitle, resolveDisplayCourseCode } from '@/lib/past-papers/titleNormalizer';

interface CourseMeta {
  id: string;
  course_code: string | null;
  title: string | null;
}

interface PastPaperItem {
  id: string;
  course_id?: string | null;
  course_code?: string | null;
  title?: string | null;
  year?: number | null;
  exam_type?: string | null;
  created_at?: string | null;
  user_id?: string | null;
  isKlok?: boolean;
  download_url?: string | null;
}

interface WeaknessDrillItem {
  id: string;
  topic: string;
  mastered?: boolean;
}

function safeFormatDate(dateValue?: string | number | null): string {
  if (!dateValue) return 'Official Archive';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Official Archive';
  return parsed.toLocaleDateString();
}

export default function CoursePastPapersPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId || '';

  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [papers, setPapers] = useState<PastPaperItem[]>([]);
  const [drills, setDrills] = useState<WeaknessDrillItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCoursePastPapers = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();

      const [{ data: authData }, { data: courseData }, { data: drillsData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('courses').select('id, course_code, title').eq('id', courseId).maybeSingle(),
        supabase
          .from('weakness_drills')
          .select('id, topic, mastered')
          .eq('course_id', courseId)
          .eq('mastered', false)
          .order('updated_at', { ascending: false }),
      ]);

      setCurrentUserId(authData?.user?.id || null);
      setCourse(courseData || null);
      setDrills(Array.isArray(drillsData) ? drillsData : []);

      const normalizedCode = courseData?.course_code
        ? courseData.course_code.toUpperCase().replace(/[^A-Z0-9]/g, '')
        : null;

      // 1. Fetch database past papers for this course
      let dbPapers: PastPaperItem[] = [];
      try {
        let papersQuery = supabase.from('past_papers').select('*');
        if (normalizedCode) {
          papersQuery = papersQuery.or(
            `course_id.eq.${courseId},normalized_course_code.eq.${normalizedCode}`
          );
        } else {
          papersQuery = papersQuery.eq('course_id', courseId);
        }
        const { data: pastPapers } = await papersQuery.order('year', { ascending: false });
        if (Array.isArray(pastPapers)) {
          dbPapers = pastPapers.map((p: any) => ({
            ...p,
            course_code: resolveDisplayCourseCode({
              courseCode: p.course_code,
              joinedCourseCode: courseData?.course_code,
              normalizedCode: p.normalized_course_code,
              paperTitle: p.title,
              courseTitle: courseData?.title,
              fallback: courseData?.course_code || 'EXAM',
            }),
          }));
        }
      } catch (dbErr) {
        console.warn('[CoursePastPapersPage] DB papers query notice:', dbErr);
      }

      // 2. Fetch official KLOK archive papers via our resilient proxy API
      let klokPapers: PastPaperItem[] = [];
      const queryTerm = courseData?.course_code
        ? courseData.course_code.trim()
        : courseData?.title?.trim() || '';

      if (queryTerm) {
        try {
          const res = await fetch(
            `/api/v1/past-questions?q=${encodeURIComponent(queryTerm)}`,
            { signal: AbortSignal.timeout(6000) }
          );
          if (res.ok) {
            const kData = await res.json();
            const rawItems = kData.items || (Array.isArray(kData) ? kData : []);
            const filtered = rawItems.filter((item: any) => {
              if (!normalizedCode) return true;
              const rawName = String(item.title || item.name || item.filename || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
              const idx = rawName.indexOf(normalizedCode);
              if (idx === -1) return false;
              const nextChar = rawName[idx + normalizedCode.length];
              return !nextChar || !/[0-9]/.test(nextChar);
            });

            klokPapers = filtered.map((item: any) => ({
              id: String(item.id),
              course_id: courseId,
              course_code: resolveDisplayCourseCode({
                courseCode: item.course_code,
                joinedCourseCode: courseData?.course_code,
                normalizedCode: item.normalized_course_code,
                paperTitle: item.title || item.name,
                courseTitle: courseData?.title,
                fallback: courseData?.course_code || 'EXAM',
              }),
              title: normalizePastPaperTitle(item.title || item.name),
              year: Number(item.year) || new Date().getFullYear(),
              exam_type: item.exam_type || 'end-semester',
              created_at: item.created_at || null,
              isKlok: item.source === 'klok' || Boolean(item.isKlok),
              download_url:
                item.download_url ||
                `/api/v1/past-questions/download?id=${encodeURIComponent(String(item.id))}`,
            }));
          }
        } catch (klokErr) {
          console.warn('[CoursePastPapersPage] Archive lookup notice:', klokErr);
        }
      }

      // 3. Deduplicate papers (prioritize DB records)
      const dedupMap = new Map<string, PastPaperItem>();
      for (const p of [...dbPapers, ...klokPapers]) {
        if (!p?.id) continue;
        const cleanTitle = normalizePastPaperTitle(p.title)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        const key = `${p.year || ''}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
        if (!dedupMap.has(key) && !dedupMap.has(p.id)) {
          dedupMap.set(key, p);
          dedupMap.set(p.id, p);
        }
      }

      const seenIds = new Set<string>();
      const merged: PastPaperItem[] = [];
      for (const p of dedupMap.values()) {
        if (p.id && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          merged.push(p);
        }
      }

      setPapers(merged);
    } catch (err: any) {
      console.error('[CoursePastPapersPage] Load error:', err);
      setErrorMsg(err?.message || 'Unable to load past papers right now.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadCoursePastPapers();
  }, [loadCoursePastPapers]);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Courses
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {course?.course_code ? `${course.course_code} Past Papers` : 'Course Past Papers'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-muted text-xs font-mono font-bold text-foreground">
              {papers.length}
            </span>
          </div>
          {course?.title && (
            <p className="text-xs sm:text-sm text-muted-foreground">{course.title}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCoursePastPapers()}
            disabled={loading}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {courseId && <CourseUploadPastPaperButton courseId={courseId} />}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button variant="outline" size="sm" onClick={() => void loadCoursePastPapers()}>
            Try Again
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Papers List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-primary" />
            Available Examination Papers
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : papers.length === 0 ? (
            <EmptyState
              title={`No past questions found for ${course?.course_code || 'this course'}`}
              description="Upload this semester's examination paper or mid-semester test PDF to unlock interactive mock exams and worked solutions."
              badge="Course Repository"
              icon={FileText}
            />
          ) : (
            <div className="grid gap-3.5">
              {papers.map((paper) => {
                const displayTitle =
                  normalizePastPaperTitle(paper.title) ||
                  `${paper.year || ''} ${paper.exam_type === 'end-semester' ? 'Final Exam' : 'Midterm'}`.trim();
                const downloadHref =
                  paper.download_url ||
                  `/api/v1/past-questions/download?id=${encodeURIComponent(paper.id)}`;

                return (
                  <div
                    key={paper.id}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border/80 hover:border-primary/50 rounded-xl shadow-xs hover:shadow-md transition-all gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {resolveDisplayCourseCode({
                            courseCode: paper.course_code,
                            joinedCourseCode: course?.course_code,
                            paperTitle: paper.title,
                            courseTitle: course?.title,
                            fallback: course?.course_code || 'EXAM',
                          })}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {paper.exam_type === 'end-semester' ? 'Final Examination' : 'Mid-Semester Exam'}
                        </span>
                        {paper.year && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {paper.year}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors break-words">
                        {displayTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{safeFormatDate(paper.created_at)}</span>
                        <span>•</span>
                        <span>100 Marks Available</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {currentUserId && paper.user_id === currentUserId && (
                        <DeletePastPaperButton
                          paperId={paper.id}
                          paperTitle={displayTitle}
                          onDeleted={() => void loadCoursePastPapers()}
                        />
                      )}
                      <a href={downloadHref} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer border border-primary/20">
                          <DownloadCloud className="w-3.5 h-3.5 text-primary" />
                          <span>PDF</span>
                        </Button>
                      </a>
                      <Link href={`/dashboard/past-papers/${encodeURIComponent(paper.id)}`}>
                        <Button size="sm" className="gap-1.5 cursor-pointer shadow-xs font-semibold">
                          <span>Start Mock</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Weakness Drills */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3 text-foreground">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Course Weak Areas
            </h3>
            {drills.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Attempt a timed past paper mock to automatically detect weak topics and generate 5-minute revision drills.
              </p>
            ) : (
              <div className="space-y-2.5">
                {drills.map((drill) => (
                  <div
                    key={drill.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border gap-2"
                  >
                    <span className="text-xs font-medium break-words">{drill.topic}</span>
                    <Link href={`/dashboard/past-papers/drills/${drill.id}`}>
                      <Button size="sm" variant="secondary" className="h-7 text-xs shrink-0">
                        Drill
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
