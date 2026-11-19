'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  Upload,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import { getSlideThumbnailUrl } from '@/lib/images';
import { resolveCourseColor } from '@/lib/constants/courses';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  ExamFocusAreaSummary,
  ExamFocusCoverageGap,
  ExamFocusPracticeQuestion,
  ExamFocusQuestionMatch,
  ExamFocusSlideMatch,
} from '../../../../shared/lib/examFocus';

export interface ExamFocusCourseOption {
  id: string;
  course_code?: string | null;
  title: string;
  colour?: string | null;
}

export interface GeneratedPracticeGroup {
  area: string;
  questions: ExamFocusPracticeQuestion[];
  created_at?: string;
}

export interface ExamFocusPack {
  id: string;
  user_id?: string;
  course_id: string;
  title: string;
  raw_areas_input: string;
  areas: string[];
  areas_hash: string;
  matched_slides: ExamFocusSlideMatch[];
  matched_questions: ExamFocusQuestionMatch[];
  generated_questions?: GeneratedPracticeGroup[];
  study_summary: ExamFocusAreaSummary[];
  coverage_gaps: ExamFocusCoverageGap[];
  created_at?: string;
  updated_at?: string;
  persisted?: boolean;
}

interface ExamFocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: ExamFocusCourseOption[];
  initialCourseId?: string | null;
  defaultTab?: 'areas' | 'slides' | 'questions';
}

const OFFLINE_CACHE_PREFIX = 'unistudy_exam_focus_packs_v1_';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function readOfflinePacks(courseId: string): ExamFocusPack[] {
  if (typeof window === 'undefined' || !courseId) return [];
  try {
    const raw = window.localStorage.getItem(`${OFFLINE_CACHE_PREFIX}${courseId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOfflinePacks(courseId: string, packs: ExamFocusPack[]): void {
  if (typeof window === 'undefined' || !courseId) return;
  try {
    window.localStorage.setItem(`${OFFLINE_CACHE_PREFIX}${courseId}`, JSON.stringify(packs.slice(0, 10)));
  } catch {
    // ignore storage quota errors
  }
}

function parseMcqStemAndOptions(text: string): { stem: string; options: string[] } {
  const rx = /(?:^|\n)[ \t]*([A-Ea-e][.)][ \t]+.+)/g;
  const firstIdx = text.search(/(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/);
  const stem = firstIdx > -1 ? text.slice(0, firstIdx).trim() : text.trim();
  const options: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text)) !== null) {
    options.push(match[1].trim());
  }
  return { stem, options };
}

export function ExamFocusDialog({
  open,
  onOpenChange,
  courses,
  initialCourseId,
  defaultTab = 'areas',
}: ExamFocusDialogProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || courses[0]?.id || ''
  );
  const [packs, setPacks] = useState<ExamFocusPack[]>([]);
  const [activePackId, setActivePackId] = useState<string>('');
  const [showBuilder, setShowBuilder] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'areas' | 'slides' | 'questions'>(defaultTab);

  const [packTitleInput, setPackTitleInput] = useState('');
  const [rawAreasInput, setRawAreasInput] = useState('');

  const [loadingPacks, setLoadingPacks] = useState(false);
  const [extractingFile, setExtractingFile] = useState(false);
  const [generatingPack, setGeneratingPack] = useState(false);
  const [refreshingPack, setRefreshingPack] = useState(false);
  const [generatingPracticeArea, setGeneratingPracticeArea] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Interactive drill selections: key = `${area}:${idx}` -> chosen letter
  const [mcqSelections, setMcqSelections] = useState<Record<string, string>>({});
  const [revealedTheory, setRevealedTheory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncNetwork = () => setIsOffline(!window.navigator.onLine);
    syncNetwork();
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
    return () => {
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      if (initialCourseId && courses.some((c) => c.id === initialCourseId)) {
        setSelectedCourseId(initialCourseId);
      } else if (!selectedCourseId && courses[0]?.id) {
        setSelectedCourseId(courses[0].id);
      }
    }
  }, [open, initialCourseId, defaultTab, courses, selectedCourseId]);

  const loadPacksForCourse = useCallback(async (courseId: string) => {
    if (!courseId) return;
    setLoadingPacks(true);
    setErrorMsg(null);
    try {
      if (typeof window !== 'undefined' && !window.navigator.onLine) {
        const offlineList = readOfflinePacks(courseId);
        setPacks(offlineList);
        if (offlineList.length > 0) {
          setActivePackId(offlineList[0].id);
          setShowBuilder(false);
        } else {
          setActivePackId('');
          setShowBuilder(true);
        }
        return;
      }

      const data = await apiFetch(`/exam-focus/${courseId}`);
      const list: ExamFocusPack[] = Array.isArray(data) ? data : [];
      setPacks(list);
      writeOfflinePacks(courseId, list);
      if (list.length > 0) {
        setActivePackId((prev) => (prev && list.some((p) => p.id === prev) ? prev : list[0].id));
        setShowBuilder(false);
      } else {
        setActivePackId('');
        setShowBuilder(true);
      }
    } catch (err: any) {
      const offlineFallback = readOfflinePacks(courseId);
      if (offlineFallback.length > 0) {
        setPacks(offlineFallback);
        setActivePackId(offlineFallback[0].id);
        setShowBuilder(false);
      } else {
        setErrorMsg(err?.message || 'Could not load saved exam focus packs.');
      }
    } finally {
      setLoadingPacks(false);
    }
  }, []);

  useEffect(() => {
    if (open && selectedCourseId) {
      void loadPacksForCourse(selectedCourseId);
    }
  }, [open, selectedCourseId, loadPacksForCourse]);

  const activePack = useMemo(
    () => packs.find((p) => p.id === activePackId) || null,
    [packs, activePackId]
  );

  const activeCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const handleExtractFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      toast.error('Upload a PNG, JPG, WebP image, or PDF document.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File exceeds the 10MB size limit.');
      return;
    }
    if (isOffline) {
      toast.error('Cannot extract files while offline.');
      return;
    }

    setExtractingFile(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/exam-focus/extract-areas', {
        method: 'POST',
        body: formData,
      });
      const extracted = String(res?.rawText || '').trim();
      if (!extracted) {
        throw new Error('No exam topics could be read from that file.');
      }
      setRawAreasInput((prev) => (prev.trim() ? `${prev.trim()}\n${extracted}` : extracted));
      toast.success(
        `Extracted ${Array.isArray(res?.areas) ? res.areas.length : 'exam'} areas (${res?.source === 'pdf_text' ? 'PDF text' : 'Vision OCR'})`
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to read exam areas from file.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setExtractingFile(false);
    }
  };

  const handleGeneratePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Select a course first.');
      return;
    }
    if (!rawAreasInput.trim()) {
      toast.error('Enter or upload at least one lecturer exam area.');
      return;
    }
    if (isOffline) {
      toast.error('Reconnect to the internet to scrape course slides and past questions.');
      return;
    }

    setGeneratingPack(true);
    setErrorMsg(null);
    try {
      const created = (await apiFetch('/exam-focus/generate', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: packTitleInput.trim() || undefined,
          rawAreasInput: rawAreasInput.trim(),
        }),
      })) as ExamFocusPack;

      const updatedPacks = [created, ...packs.filter((p) => p.id !== created.id)];
      setPacks(updatedPacks);
      writeOfflinePacks(selectedCourseId, updatedPacks);
      setActivePackId(created.id);
      setShowBuilder(false);
      setPackTitleInput('');
      toast.success(
        `Scraped ${created.matched_slides.length} slides and ${created.matched_questions.length} past questions across ${created.areas.length} areas.`
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to build Exam Focus Pack.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setGeneratingPack(false);
    }
  };

  const handleRefreshPack = async () => {
    if (!activePack || isOffline) return;
    if (activePack.id.startsWith('local-')) {
      toast.info('Re-run "Scrape & Build Focus Pack" to refresh unsaved local packs.');
      return;
    }
    setRefreshingPack(true);
    setErrorMsg(null);
    try {
      const refreshed = (await apiFetch(`/exam-focus/${activePack.id}/refresh`, {
        method: 'POST',
      })) as ExamFocusPack;
      const next = packs.map((p) => (p.id === refreshed.id ? refreshed : p));
      setPacks(next);
      writeOfflinePacks(selectedCourseId, next);
      toast.success('Refreshed slide and past-question matches.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to refresh pack.');
    } finally {
      setRefreshingPack(false);
    }
  };

  const handleDeletePack = async () => {
    if (!activePack || isOffline) return;
    const deleteId = activePack.id;
    try {
      if (!deleteId.startsWith('local-')) {
        await apiFetch(`/exam-focus/${deleteId}`, { method: 'DELETE' });
      }
      const remaining = packs.filter((p) => p.id !== deleteId);
      setPacks(remaining);
      writeOfflinePacks(selectedCourseId, remaining);
      setActivePackId(remaining[0]?.id || '');
      if (remaining.length === 0) setShowBuilder(true);
      toast.success('Deleted Exam Focus Pack.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete pack.');
    }
  };

  const handleGeneratePractice = async (area: string) => {
    if (!activePack || isOffline) {
      if (isOffline) toast.error('Reconnect to generate practice questions.');
      return;
    }
    setGeneratingPracticeArea(area);
    try {
      const areaSlides = activePack.matched_slides.filter(
        (s) => s.area.toLowerCase() === area.toLowerCase()
      );
      const res = await apiFetch(`/exam-focus/${activePack.id}/generate-practice`, {
        method: 'POST',
        body: JSON.stringify({
          area,
          courseId: activePack.course_id,
          matchedSlidesFallback: areaSlides,
        }),
      });
      const updatedGroups: GeneratedPracticeGroup[] = Array.isArray(res?.generated_questions)
        ? res.generated_questions
        : [];
      const nextPacks = packs.map((p) =>
        p.id === activePack.id ? { ...p, generated_questions: updatedGroups } : p
      );
      setPacks(nextPacks);
      writeOfflinePacks(selectedCourseId, nextPacks);
      setActiveTab('questions');
      toast.success(`Generated targeted MCQ & Theory drills for "${area}".`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not generate practice questions.');
    } finally {
      setGeneratingPracticeArea(null);
    }
  };

  const totalMarks = useMemo(() => {
    if (!activePack) return 0;
    return activePack.matched_questions.reduce((acc, q) => acc + (q.marks_available || 0), 0);
  }, [activePack]);

  const gapCount = useMemo(() => {
    if (!activePack) return 0;
    return activePack.coverage_gaps.filter((g) => g.missing_slides || g.missing_questions).length;
  }, [activePack]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[96vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Target className="w-5 h-5 text-primary" />
                Exam Areas of Concentration
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter or upload the lecturer&apos;s exam topics to scrape all matching slides, past questions, coverage gaps, and targeted practice drills.
              </DialogDescription>
            </div>

            {courses.length > 0 ? (
              <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor="exam-focus-course" className="text-xs text-muted-foreground whitespace-nowrap">
                  Course:
                </Label>
                <select
                  id="exam-focus-course"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold outline-none max-w-[220px] cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code ? `${c.course_code} — ${c.title}` : c.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isOffline ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Offline mode: viewing locally cached packs read-only. Reconnect to scrape new areas or generate practice drills.</span>
            </div>
          ) : null}

          {errorMsg ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-center justify-between gap-3 text-xs text-destructive">
              <span>{errorMsg}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => void loadPacksForCourse(selectedCourseId)}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2 bg-muted/20">
              <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold">No active courses yet</h3>
              <p className="text-xs text-muted-foreground">
                Create a course and upload lecture decks first so Exam Focus can scrape your course slides and past papers.
              </p>
            </div>
          ) : loadingPacks ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Saved Packs Bar + New Pack Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  {packs.map((pack) => {
                    const selected = !showBuilder && pack.id === activePackId;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => {
                          setActivePackId(pack.id);
                          setShowBuilder(false);
                        }}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:border-primary/40'
                        )}
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span className="max-w-[200px] truncate">{pack.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  {activePack && !showBuilder ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={refreshingPack || isOffline}
                        onClick={() => void handleRefreshPack()}
                        className="h-8 text-xs gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', refreshingPack && 'animate-spin')} />
                        Re-scrape
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isOffline}
                        onClick={() => void handleDeletePack()}
                        className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </>
                  ) : null}

                  <Button
                    type="button"
                    variant={showBuilder ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowBuilder((prev) => (packs.length > 0 ? !prev : true))}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showBuilder && packs.length > 0 ? 'View Saved Pack' : 'New Exam Areas'}
                  </Button>
                </div>
              </div>

              {/* Input Builder Form (Paste Text OR Upload Screenshot/PDF) */}
              {showBuilder ? (
                <form
                  onSubmit={handleGeneratePack}
                  className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: resolveCourseColor(activeCourse?.colour || undefined) }}
                      />
                      <h3 className="text-sm font-bold text-foreground">
                        {activeCourse?.course_code || activeCourse?.title} Scope Input
                      </h3>
                    </div>

                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors">
                      {extractingFile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-primary" />
                      )}
                      {extractingFile ? 'Reading Image/PDF...' : 'Upload Outline Photo or PDF'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                        onChange={handleExtractFile}
                        disabled={extractingFile || generatingPack}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="focus-title" className="text-xs font-medium text-muted-foreground">
                        Pack Name (Optional)
                      </Label>
                      <Input
                        id="focus-title"
                        value={packTitleInput}
                        onChange={(e) => setPackTitleInput(e.target.value)}
                        placeholder={`e.g. ${activeCourse?.course_code || 'Course'} End-of-Semester Areas`}
                        className="mt-1 h-9 text-xs bg-background"
                      />
                    </div>

                    <div>
                      <Label htmlFor="focus-areas" className="text-xs font-medium text-muted-foreground">
                        Lecturer Exam Areas (one topic per line, or upload screenshot/PDF above)
                      </Label>
                      <Textarea
                        id="focus-areas"
                        value={rawAreasInput}
                        onChange={(e) => setRawAreasInput(e.target.value)}
                        rows={6}
                        placeholder={
                          '1. Database Normalization (1NF, 2NF, 3NF, BCNF)\n2. ACID Properties & Write-Ahead Logging\n3. Two-Phase Locking (2PL) & Deadlock Prevention\n4. Data Warehousing, Star Schema & ETL'
                        }
                        className="mt-1 text-xs bg-background font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      Scrapes all uploaded slide decks and past papers in this course simultaneously and cites [Slide N] sources.
                    </p>
                    <Button
                      type="submit"
                      disabled={generatingPack || extractingFile || !rawAreasInput.trim() || isOffline}
                      className="h-9 px-4 text-xs font-semibold gap-1.5 bg-[#5B2D8E] dark:bg-primary text-white hover:bg-[#492274] cursor-pointer"
                    >
                      {generatingPack ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Scanning Slides &amp; Past Questions...
                        </>
                      ) : (
                        <>
                          <Target className="w-3.5 h-3.5" />
                          Scrape Slides &amp; Past Questions
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : activePack ? (
                <div className="space-y-4">
                  {/* 4-Tile Readiness Telemetry */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Exam Areas
                        </div>
                        <div className="font-mono text-lg font-bold tabular-nums">{activePack.areas.length}</div>
                      </div>
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Matched Slides
                        </div>
                        <div className="font-mono text-lg font-bold tabular-nums">{activePack.matched_slides.length}</div>
                      </div>
                      <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Matched Past Qs
                        </div>
                        <div className="font-mono text-lg font-bold tabular-nums">
                          {activePack.matched_questions.length}
                          <span className="text-[11px] font-normal text-muted-foreground"> ({totalMarks} mks)</span>
                        </div>
                      </div>
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Coverage Gaps
                        </div>
                        <div className="font-mono text-lg font-bold tabular-nums">{gapCount}</div>
                      </div>
                      <AlertTriangle
                        className={cn(
                          'w-4 h-4',
                          gapCount > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      />
                    </div>
                  </div>

                  {/* Section Tabs */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2.5">
                    {(
                      [
                        { id: 'areas', label: `By Exam Area (${activePack.areas.length})` },
                        { id: 'slides', label: `Matched Slides (${activePack.matched_slides.length})` },
                        { id: 'questions', label: `Questions & Drills (${activePack.matched_questions.length})` },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                          activeTab === t.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BY EXAM AREA */}
                  {activeTab === 'areas' ? (
                    <div className="space-y-4">
                      {activePack.areas.map((area) => {
                        const summary = activePack.study_summary.find((s) => s.area === area);
                        const slides = activePack.matched_slides.filter((s) => s.area === area);
                        const questions = activePack.matched_questions.filter((q) => q.area === area);
                        const gap = activePack.coverage_gaps.find((g) => g.area === area);
                        const hasGap = Boolean(gap?.missing_slides || gap?.missing_questions);
                        const generatedGroup = (activePack.generated_questions || []).find(
                          (g) => g.area.toLowerCase() === area.toLowerCase()
                        );

                        return (
                          <section
                            key={area}
                            className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-foreground">{area}</h4>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                                  <span className="rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5">
                                    {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
                                  </span>
                                  <span className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                                    {questions.length} past Qs ({gap?.total_marks ?? 0} mks)
                                  </span>
                                  {generatedGroup && generatedGroup.questions.length > 0 ? (
                                    <span className="rounded bg-primary/10 text-primary px-2 py-0.5">
                                      +{generatedGroup.questions.length} AI drill Qs
                                    </span>
                                  ) : null}
                                  {hasGap ? (
                                    <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 inline-flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      {gap?.missing_slides && gap?.missing_questions
                                        ? 'No Slide & Question Match'
                                        : gap?.missing_slides
                                          ? 'Missing in Slides'
                                          : 'No Past Qs Found'}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant={gap?.missing_questions ? 'default' : 'outline'}
                                size="sm"
                                disabled={generatingPracticeArea === area || isOffline}
                                onClick={() => void handleGeneratePractice(area)}
                                className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer"
                              >
                                {generatingPracticeArea === area ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generating Drills...
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {generatedGroup ? 'Regenerate Practice Qs' : 'Generate Practice Qs'}
                                  </>
                                )}
                              </Button>
                            </div>

                            {gap?.gap_note ? (
                              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                                {gap.gap_note}
                              </div>
                            ) : null}

                            {summary ? (
                              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs text-foreground">
                                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {summary.high_yield_summary}
                                  </ReactMarkdown>
                                </div>
                                {summary.key_concepts.length > 0 ? (
                                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                    {summary.key_concepts.map((kc, kIdx) => (
                                      <li key={kIdx}>{kc}</li>
                                    ))}
                                  </ul>
                                ) : null}
                                {summary.exam_tips ? (
                                  <div className="text-[11px] font-medium text-primary pt-1 border-t border-border/50">
                                    Exam Strategy: {summary.exam_tips}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {/* Matched Slide Strip */}
                            {slides.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                                {slides.slice(0, 4).map((sl) => {
                                  const thumb = getSlideThumbnailUrl(sl.image_url);
                                  return (
                                    <Link
                                      key={`${sl.slide_id}-${sl.slide_number}`}
                                      href={`/dashboard/courses/${activePack.course_id}/lectures/${sl.lecture_id}?slide=${sl.slide_number}`}
                                      className="group rounded-lg border border-border/70 bg-background hover:border-primary/50 overflow-hidden transition-all"
                                    >
                                      {thumb ? (
                                        <div className="aspect-video w-full bg-muted overflow-hidden">
                                          <img
                                            src={thumb}
                                            alt={`${sl.lecture_title} Slide ${sl.slide_number}`}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                                          />
                                        </div>
                                      ) : null}
                                      <div className="p-2 space-y-0.5">
                                        <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-primary">
                                          <span>
                                            {sl.week ? `W${sl.week} · ` : ''}Slide {sl.slide_number}
                                          </span>
                                          <ExternalLink className="w-3 h-3 opacity-60" />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                                          {sl.snippet}
                                        </p>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            ) : null}

                            {/* Matched Past Questions Preview */}
                            {questions.length > 0 ? (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                                  Matched Past Questions
                                </div>
                                <div className="space-y-1.5">
                                  {questions.slice(0, 3).map((q) => (
                                    <Link
                                      key={`${q.paper_id}-${q.question_id}`}
                                      href={`/dashboard/past-papers/${q.paper_id}`}
                                      className="block rounded-lg border border-border/60 bg-background hover:border-primary/40 px-3 py-2 text-xs transition-colors"
                                    >
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="font-mono text-[10px] font-semibold text-primary">
                                          {q.paper_title} · Q{q.question_number} ({q.marks_available} mks · {q.is_mcq ? 'MCQ' : 'Theory'})
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                      </div>
                                      <p className="text-muted-foreground line-clamp-2">{q.text_content}</p>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </section>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* TAB 2: ALL MATCHED SLIDES */}
                  {activeTab === 'slides' ? (
                    activePack.matched_slides.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
                        No uploaded course slides matched the entered areas yet. Upload the relevant week&apos;s lecture deck and click Re-scrape.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activePack.matched_slides.map((sl, idx) => {
                          const thumb = getSlideThumbnailUrl(sl.image_url);
                          return (
                            <Link
                              key={`${sl.area}-${sl.slide_id}-${idx}`}
                              href={`/dashboard/courses/${activePack.course_id}/lectures/${sl.lecture_id}?slide=${sl.slide_number}`}
                              className="rounded-xl border border-border/80 bg-card hover:border-primary/50 overflow-hidden transition-all flex flex-col"
                            >
                              {thumb ? (
                                <div className="aspect-video w-full bg-muted overflow-hidden">
                                  <img
                                    src={thumb}
                                    alt={`${sl.lecture_title} Slide ${sl.slide_number}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : null}
                              <div className="p-3 space-y-1.5 flex-1">
                                <div className="text-[10px] font-mono font-semibold text-primary uppercase tracking-wider truncate">
                                  {sl.area}
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="truncate">
                                    {sl.lecture_title} · Slide {sl.slide_number}
                                  </span>
                                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-3">{sl.snippet}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )
                  ) : null}

                  {/* TAB 3: QUESTIONS & INTERACTIVE PRACTICE DRILLS */}
                  {activeTab === 'questions' ? (
                    <div className="space-y-5">
                      {activePack.areas.map((area) => {
                        const realQs = activePack.matched_questions.filter((q) => q.area === area);
                        const genGroup = (activePack.generated_questions || []).find(
                          (g) => g.area.toLowerCase() === area.toLowerCase()
                        );
                        const genQs = genGroup?.questions || [];

                        return (
                          <div key={area} className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{area}</h4>
                                <p className="text-[11px] text-muted-foreground">
                                  {realQs.length} past paper question(s) · {genQs.length} slide-grounded practice drill(s)
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={generatingPracticeArea === area || isOffline}
                                onClick={() => void handleGeneratePractice(area)}
                                className="h-8 text-xs gap-1.5 cursor-pointer"
                              >
                                {generatingPracticeArea === area ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    {genQs.length > 0 ? 'Refresh AI Drills' : 'Generate Practice Qs'}
                                  </>
                                )}
                              </Button>
                            </div>

                            {realQs.length > 0 ? (
                              <div className="space-y-2">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                                  Real Past Exam Questions
                                </div>
                                {realQs.map((q) => {
                                  const { stem, options } = parseMcqStemAndOptions(q.text_content);
                                  return (
                                    <div
                                      key={`${area}-${q.question_id}`}
                                      className="rounded-lg border border-border/70 bg-muted/15 p-3 space-y-2 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[10px] font-semibold text-primary">
                                          {q.paper_title} · Q{q.question_number} · {q.marks_available} marks
                                        </span>
                                        <Link
                                          href={`/dashboard/past-papers/${q.paper_id}`}
                                          className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                          Open Paper <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      </div>
                                      <p className="font-medium text-foreground">{stem}</p>
                                      {options.length > 0 ? (
                                        <ul className="space-y-1 text-muted-foreground pl-1">
                                          {options.map((opt, oIdx) => (
                                            <li key={oIdx}>{opt}</li>
                                          ))}
                                        </ul>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                                No matching past paper questions were found for this area yet. Use Generate Practice Qs to drill it now.
                              </div>
                            )}

                            {genQs.length > 0 ? (
                              <div className="space-y-2 pt-1">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                                  Slide-Grounded Practice Drills
                                </div>
                                {genQs.map((gq, qIdx) => {
                                  const key = `${area}:${qIdx}`;
                                  const chosen = mcqSelections[key];
                                  const theoryOpen = Boolean(revealedTheory[key]);

                                  return (
                                    <div
                                      key={key}
                                      className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[10px] font-bold uppercase text-primary">
                                          {gq.type} · {gq.marks_available} {gq.marks_available === 1 ? 'mark' : 'marks'}
                                        </span>
                                        {gq.slide_citations.length > 0 ? (
                                          <span className="font-mono text-[10px] text-muted-foreground">
                                            Cites Slides: {gq.slide_citations.join(', ')}
                                          </span>
                                        ) : null}
                                      </div>

                                      <p className="font-semibold text-foreground">{gq.question}</p>

                                      {gq.type === 'MCQ' && gq.options.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {gq.options.map((opt, oIdx) => {
                                            const letterMatch = opt.match(/^([A-Ea-e])[.)]/);
                                            const letter = (letterMatch?.[1] || String.fromCharCode(65 + oIdx)).toUpperCase();
                                            const isChosen = chosen === letter;
                                            const isCorrect = letter === gq.correct_answer.toUpperCase();
                                            return (
                                              <button
                                                key={oIdx}
                                                type="button"
                                                onClick={() =>
                                                  setMcqSelections((prev) => ({ ...prev, [key]: letter }))
                                                }
                                                className={cn(
                                                  'w-full text-left rounded-md border px-2.5 py-1.5 transition-colors flex items-center justify-between gap-2 cursor-pointer',
                                                  !chosen
                                                    ? 'border-border bg-background hover:border-primary/40'
                                                    : isCorrect
                                                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                                      : isChosen
                                                        ? 'border-destructive/60 bg-destructive/10 text-destructive'
                                                        : 'border-border bg-background opacity-70'
                                                )}
                                              >
                                                <span>{opt}</span>
                                                {chosen && isCorrect ? (
                                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                                ) : chosen && isChosen ? (
                                                  <XCircle className="w-3.5 h-3.5 shrink-0 text-destructive" />
                                                ) : null}
                                              </button>
                                            );
                                          })}
                                          {chosen ? (
                                            <div className="rounded bg-background/80 border border-border/60 p-2 text-[11px] text-muted-foreground">
                                              <span className="font-semibold text-foreground">Explanation: </span>
                                              {gq.explanation}
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[11px] cursor-pointer"
                                            onClick={() =>
                                              setRevealedTheory((prev) => ({ ...prev, [key]: !prev[key] }))
                                            }
                                          >
                                            {theoryOpen ? 'Hide Model Marking Guide' : 'Show Model Marking Guide'}
                                          </Button>
                                          {theoryOpen ? (
                                            <div className="rounded bg-background/90 border border-border/70 p-2.5 space-y-1 text-[11px]">
                                              <p className="text-foreground font-medium">{gq.correct_answer}</p>
                                              <p className="text-muted-foreground">{gq.explanation}</p>
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
                  Create your first Exam Focus Pack by clicking New Exam Areas above.
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
