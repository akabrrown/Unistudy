'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Save,
  Pin,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Clock,
  Sparkles,
  BookOpen,
  PlaySquare,
  Maximize2,
  Minimize2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CourseItem {
  id: string;
  title: string;
  course_code: string;
}

const NOTE_TEMPLATES: Record<string, { label: string; content: string }> = {
  cornell: {
    label: 'Cornell Notes',
    content: `## Lecture Cues & Questions
- What is the core theorem or mechanism introduced?
- Under what boundary conditions does this hold?

## Detailed Lecture Notes
- [00:00] Core thesis & lecture overview:
- Key definitions:

## Post-Lecture 3-Sentence Summary
1. 
2. 
3. `,
  },
  formulas: {
    label: 'Formula & Derivation Log',
    content: `## Core Equations & Variables
- **Formula 1:** $$  $$
  - Variables & units:
- **Derivation Steps:**
  1. 
  2. 

## Worked Example Takeaways
- Common algebraic or sign pitfalls to avoid:`,
  },
  exam: {
    label: 'Exam Revision Checklist',
    content: `## High-Yield Exam Takeaways
- [ ] Core concept 1:
- [ ] Typical past-paper question pattern:
- [ ] Edge case emphasized by lecturer:

## Self-Test Questions
1. Q: 
   A: `,
  },
};

export default function YouTubeWatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const searchParams = useSearchParams();
  const unwrappedParams = use(params);
  const videoId = unwrappedParams.videoId;

  const title = searchParams.get('title') || `University Lecture (${videoId})`;
  const channel = searchParams.get('channel') || 'Academic Lecture Stream';
  const initialCourseId = searchParams.get('courseId') || '';

  const storageKey = `unistudy_yt_notes_${videoId}`;

  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(`unistudy_yt_notes_${videoId}`) || '';
    } catch {
      return '';
    }
  });

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [isPinning, setIsPinning] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isTogglingWatched, setIsTogglingWatched] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [timestampInput, setTimestampInput] = useState('05:00');
  const [copied, setCopied] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>('Synced');

  useEffect(() => {
    let active = true;
    fetch('/api/courses')
      .then((r) => (r.ok ? r.json() : []))
      .then((payload: unknown) => {
        if (!active) return;
        const list: CourseItem[] = Array.isArray(payload)
          ? (payload as CourseItem[])
          : Array.isArray((payload as { courses?: CourseItem[] })?.courses)
          ? (payload as { courses: CourseItem[] }).courses
          : [];
        setCourses(list);
        if (!initialCourseId && list.length > 0) {
          setSelectedCourseId((prev) => prev || list[0].id);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialCourseId]);

  const handleNotesChange = (nextValue: string) => {
    setNotes(nextValue);
    try {
      localStorage.setItem(storageKey, nextValue);
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch {}
  };

  const handleSaveNotesManual = () => {
    try {
      localStorage.setItem(storageKey, notes);
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      toast.success('Lecture notes saved to local study vault');
    } catch {
      toast.error('Could not save notes to browser storage');
    }
  };

  const insertSnippet = (snippet: string) => {
    const prefix = notes.trim().length > 0 ? `${notes.trimEnd()}\n\n` : '';
    const updated = `${prefix}${snippet}`;
    handleNotesChange(updated);
  };

  const handleInsertTag = (tagLabel: string) => {
    const cleanTime = timestampInput.trim() || '00:00';
    insertSnippet(`- **[${cleanTime}] ${tagLabel}:** `);
    toast.success(`Inserted [${cleanTime}] ${tagLabel} marker`);
  };

  const handleApplyTemplate = (key: string) => {
    const tpl = NOTE_TEMPLATES[key];
    if (!tpl) return;
    insertSnippet(tpl.content);
    toast.success(`Appended ${tpl.label} structure`);
  };

  const handleCopyNotes = async () => {
    if (!notes.trim()) {
      toast.error('Write some lecture notes first.');
      return;
    }
    await navigator.clipboard.writeText(`# ${title}\nChannel: ${channel}\nVideo: https://www.youtube.com/watch?v=${videoId}\n\n${notes}`);
    setCopied(true);
    toast.success('Copied lecture notes to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!notes.trim()) {
      toast.error('Write some lecture notes first before exporting.');
      return;
    }
    const header = `# ${title}\n- **Channel:** ${channel}\n- **Source:** https://www.youtube.com/watch?v=${videoId}\n- **Exported:** ${new Date().toISOString()}\n\n---\n\n`;
    const blob = new Blob([header + notes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || videoId}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported Markdown lecture notes');
  };

  const handlePinToCourse = async () => {
    if (!selectedCourseId) {
      toast.error('Select a course first to pin this lecture.');
      return;
    }
    setIsPinning(true);
    try {
      const res = await fetch('/api/youtube/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          title,
          channel,
          thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
          courseId: selectedCourseId,
        }),
      });
      const data = (await res.json()) as { alreadyPinned?: boolean; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to pin lecture');
      const course = courses.find((c) => c.id === selectedCourseId);
      if (data.alreadyPinned) {
        toast.info(`Already pinned to ${course?.course_code || 'course'}`);
      } else {
        toast.success(`Pinned to ${course?.course_code || 'Pinned Library'}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to pin lecture');
    } finally {
      setIsPinning(false);
    }
  };

  const handleToggleWatched = async () => {
    const nextWatched = !isWatched;
    setIsTogglingWatched(true);
    setIsWatched(nextWatched);
    try {
      const res = await fetch('/api/youtube/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, watched: nextWatched }),
      });
      if (!res.ok) throw new Error('Pin this lecture first to sync watched status');
      toast.success(nextWatched ? 'Marked lecture as watched' : 'Marked as unwatched');
    } catch (err: unknown) {
      toast.info(err instanceof Error ? err.message : 'Updated local watch status');
    } finally {
      setIsTogglingWatched(false);
    }
  };

  const noteMetrics = useMemo(() => {
    const trimmed = notes.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = trimmed ? trimmed.split('\n').length : 0;
    const timestamps = (notes.match(/\[\d{1,2}:\d{2}\]/g) || []).length;
    return { words, lines, timestamps };
  }, [notes]);

  return (
    <div className="max-w-[1440px] mx-auto space-y-5 pb-12">
      {/* Top Studio Navigation & Course Action Bar */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/dashboard/youtube"
            className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors shrink-0"
            title="Back to Discover Lectures"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-red-500 font-semibold uppercase">
                <PlaySquare className="w-3.5 h-3.5" />
                Lecture Study Studio
              </span>
              <span>·</span>
              <span className="font-semibold text-foreground/90">{channel}</span>
              <span>·</span>
              <a
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                YouTube Source
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-foreground line-clamp-1">{title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/dashboard/youtube/pinned"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors"
          >
            <Pin className="w-3.5 h-3.5 text-primary" />
            Pinned Library
          </Link>

          {courses.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                aria-label="Select course to pin"
                className="bg-transparent px-2 py-1 text-xs font-semibold text-foreground focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handlePinToCourse()}
                disabled={isPinning}
                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Pin className="w-3 h-3" />
                {isPinning ? 'Pinning...' : 'Pin'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleToggleWatched()}
            disabled={isTogglingWatched}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer',
              isWatched
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                : 'border-border bg-card hover:bg-muted text-foreground'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isWatched ? 'Watched' : 'Mark Watched'}
          </button>

          <button
            type="button"
            onClick={() => setTheaterMode((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            title="Toggle Theater View"
          >
            {theaterMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Split View
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Theater
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Video Player & Timestamp Marker Console */}
        <div className={cn('space-y-4', theaterMode ? 'lg:col-span-12' : 'lg:col-span-7')}>
          <div className="rounded-2xl overflow-hidden border border-border/80 bg-black shadow-lg">
            <iframe
              className="w-full aspect-video"
              src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Quick Timestamp & Academic Tag Insertion Bar */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Timestamp &amp; Concept Marker Injector
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Insert structured timestamp markers straight into your study manuscript
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Time</span>
                <input
                  type="text"
                  value={timestampInput}
                  onChange={(e) => setTimestampInput(e.target.value)}
                  placeholder="05:30"
                  className="w-14 bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                />
              </div>

              {(
                [
                  'Key Definition',
                  'Theorem / Proof',
                  'Formula & Units',
                  'Worked Example',
                  'Exam Tip',
                ] as const
              ).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-primary" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Synchronized Study Notes Manuscript */}
        <div
          className={cn(
            'rounded-2xl border border-border/80 bg-card flex flex-col overflow-hidden',
            theaterMode ? 'lg:col-span-12' : 'lg:col-span-5'
          )}
        >
          <div className="p-4 border-b border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Lecture Study Notes</h2>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {noteMetrics.words} words · {noteMetrics.timestamps} timestamps · {lastSavedAt}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleCopyNotes()}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                title="Copy Markdown"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                title="Export .MD"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                .MD
              </button>
              <button
                type="button"
                onClick={handleSaveNotesManual}
                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>

          {/* Note Templates Strip */}
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/10 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 shrink-0 mr-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Templates:
            </span>
            {Object.entries(NOTE_TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyTemplate(key)}
                className="rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors cursor-pointer shrink-0"
              >
                + {tpl.label}
              </button>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Write structured lecture notes, paste derivations, or click any timestamp marker button on the left to log key moments..."
            className="w-full min-h-[420px] p-4 bg-transparent resize-y font-mono text-xs sm:text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />

          <div className="px-4 py-2.5 border-t border-border/60 bg-muted/15 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Persisted automatically per video ID
            </span>
            <span className="font-mono">{noteMetrics.lines} lines</span>
          </div>
        </div>
      </div>
    </div>
  );
}
