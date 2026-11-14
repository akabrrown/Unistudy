'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Pin,
  Search,
  Play,
  CheckCircle2,
  Circle,
  Trash2,
  FileText,
  LayoutGrid,
  List,
  BookOpen,
  Clock,
  ExternalLink,
  Filter,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CourseOption, PinnedVideoRecord } from '../YouTubeStudyClient';

type LibraryStatusTab = 'all' | 'unwatched' | 'watched' | 'notes';
type LibrarySortOrder = 'recent' | 'title' | 'course';
type LibraryViewMode = 'grid' | 'list';

function getVideoNoteWordCount(videoId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(`unistudy_yt_notes_${videoId}`);
    if (!raw || !raw.trim()) return 0;
    return raw.trim().split(/\s+/).length;
  } catch {
    return 0;
  }
}

export function PinnedLibraryClient({
  courses,
  initialPinnedVideos,
}: {
  courses: CourseOption[];
  initialPinnedVideos: PinnedVideoRecord[];
}) {
  const router = useRouter();

  const [pinnedVideos, setPinnedVideos] = useState<PinnedVideoRecord[]>(initialPinnedVideos);
  const [activeCourseId, setActiveCourseId] = useState<string>('all');
  const [statusTab, setStatusTab] = useState<LibraryStatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<LibrarySortOrder>('recent');
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid');
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);

  const noteWordCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of pinnedVideos) {
      map[v.video_id] = getVideoNoteWordCount(v.video_id);
    }
    return map;
  }, [pinnedVideos]);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseOption>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  const countsByCourse = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of pinnedVideos) {
      if (v.course_id) {
        counts[v.course_id] = (counts[v.course_id] || 0) + 1;
      }
    }
    return counts;
  }, [pinnedVideos]);

  const telemetry = useMemo(() => {
    const total = pinnedVideos.length;
    const watched = pinnedVideos.filter((v) => v.watched).length;
    const unwatched = total - watched;
    const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
    const withNotes = pinnedVideos.filter((v) => (noteWordCounts[v.video_id] || 0) > 0).length;
    return { total, watched, unwatched, pct, withNotes };
  }, [pinnedVideos, noteWordCounts]);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = pinnedVideos.filter((video) => {
      if (activeCourseId !== 'all' && video.course_id !== activeCourseId) return false;
      if (statusTab === 'unwatched' && video.watched) return false;
      if (statusTab === 'watched' && !video.watched) return false;
      if (statusTab === 'notes' && (noteWordCounts[video.video_id] || 0) === 0) return false;
      if (q) {
        const course = courseMap.get(video.course_id);
        const hay = `${video.title} ${video.channel} ${course?.course_code || ''} ${
          course?.title || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortOrder === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortOrder === 'course') {
        const cA = courseMap.get(a.course_id)?.course_code || 'ZZZ';
        const cB = courseMap.get(b.course_id)?.course_code || 'ZZZ';
        return cA.localeCompare(cB);
      }
      const tA = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
      const tB = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
      return tB - tA;
    });
  }, [pinnedVideos, activeCourseId, statusTab, searchQuery, sortOrder, courseMap, noteWordCounts]);

  const handleOpenWatchStudio = (video: PinnedVideoRecord) => {
    const params = new URLSearchParams();
    params.set('title', video.title);
    if (video.channel) params.set('channel', video.channel);
    if (video.course_id) params.set('courseId', video.course_id);
    router.push(
      `/dashboard/youtube/watch/${encodeURIComponent(video.video_id)}?${params.toString()}`
    );
  };

  const handleToggleWatched = async (video: PinnedVideoRecord) => {
    const nextWatched = !video.watched;
    setBusyVideoId(video.id);
    setPinnedVideos((prev) =>
      prev.map((item) => (item.id === video.id ? { ...item, watched: nextWatched } : item))
    );

    try {
      const res = await fetch('/api/youtube/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: video.id, watched: nextWatched }),
      });
      if (!res.ok) {
        throw new Error('Failed to update watch status');
      }
      toast.success(nextWatched ? 'Marked lecture as watched' : 'Moved back to unwatched queue');
    } catch (err: unknown) {
      setPinnedVideos((prev) =>
        prev.map((item) => (item.id === video.id ? { ...item, watched: !nextWatched } : item))
      );
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyVideoId(null);
    }
  };

  const handleReassignCourse = async (video: PinnedVideoRecord, newCourseId: string) => {
    const prevCourseId = video.course_id;
    setPinnedVideos((prev) =>
      prev.map((item) => (item.id === video.id ? { ...item, course_id: newCourseId } : item))
    );
    try {
      const res = await fetch('/api/youtube/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: video.id, courseId: newCourseId }),
      });
      if (!res.ok) throw new Error('Could not reassign course');
      const targetCourse = courseMap.get(newCourseId);
      toast.success(`Moved to ${targetCourse?.course_code || 'selected course'}`);
    } catch (err: unknown) {
      setPinnedVideos((prev) =>
        prev.map((item) => (item.id === video.id ? { ...item, course_id: prevCourseId } : item))
      );
      toast.error(err instanceof Error ? err.message : 'Failed to reassign course');
    }
  };

  const handleUnpin = async (video: PinnedVideoRecord) => {
    setBusyVideoId(video.id);
    const snapshot = pinnedVideos;
    setPinnedVideos((prev) => prev.filter((item) => item.id !== video.id));

    try {
      const res = await fetch(`/api/youtube/pin?id=${encodeURIComponent(video.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to remove pinned lecture');
      }
      toast.success('Removed lecture from Pinned Library');
    } catch (err: unknown) {
      setPinnedVideos(snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to remove lecture');
    } finally {
      setBusyVideoId(null);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Studio Header & Route Switcher */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono uppercase tracking-wider">
            <Pin className="w-3.5 h-3.5" />
            Curated Course Video Vault · Pinned Library
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Pinned Lecture Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Organize saved university lectures by course code, track watch completion across your
            syllabus queue, and resume timestamped study notes.
          </p>
        </div>

        {/* Dedicated Page Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <Link
              href="/dashboard/youtube"
              className="inline-flex items-center gap-2 rounded-lg text-muted-foreground hover:text-foreground px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-red-500" />
              Discover Lectures
            </Link>
            <Link
              href="/dashboard/youtube/pinned"
              className="inline-flex items-center gap-2 rounded-lg bg-background text-foreground shadow-xs px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <Pin className="w-3.5 h-3.5 text-primary" />
              Pinned Library
              <span className="ml-0.5 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-mono font-bold">
                {telemetry.total}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* 4-Tile Library Progress Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Total Pinned Lectures
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {telemetry.total}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Saved across {Object.keys(countsByCourse).length} courses
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Pin className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div className="flex-1 pr-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Syllabus Completion
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {telemetry.pct}%{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({telemetry.watched}/{telemetry.total})
              </span>
            </p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${telemetry.pct}%` }}
              />
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Unwatched Study Queue
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {telemetry.unwatched}{' '}
              <span className="text-xs font-normal text-muted-foreground">remaining</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {telemetry.unwatched === 0 && telemetry.total > 0
                ? 'All pinned lectures completed'
                : 'Ready for active study'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Annotated with Notes
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {telemetry.withNotes}{' '}
              <span className="text-xs font-normal text-muted-foreground">lectures</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Synced in Study Studio
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Course Filter Rail + Status & Search Controls */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
        {/* Course Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Filter by Enrolled Course
            </span>
            <Link
              href="/dashboard/youtube"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              + Discover &amp; Pin More Lectures
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCourseId('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0 border',
                activeCourseId === 'all'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border'
              )}
            >
              All Courses
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-mono',
                  activeCourseId === 'all'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-background text-muted-foreground'
                )}
              >
                {pinnedVideos.length}
              </span>
            </button>

            {courses.map((course) => {
              const count = countsByCourse[course.id] || 0;
              const isSelected = activeCourseId === course.id;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setActiveCourseId(course.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0 border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  <span className="font-mono">{course.course_code}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-mono',
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-background text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Tabs, Search Input, Sort & View Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-3 border-t border-border/60">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
            {(
              [
                { id: 'all', label: `All (${telemetry.total})` },
                { id: 'unwatched', label: `Unwatched Queue (${telemetry.unwatched})` },
                { id: 'watched', label: `Completed (${telemetry.watched})` },
                { id: 'notes', label: `With Study Notes (${telemetry.withNotes})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  statusTab === tab.id
                    ? 'bg-background text-foreground shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter pinned lectures..."
                className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as LibrarySortOrder)}
                aria-label="Sort pinned lectures"
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="recent">Recently Pinned</option>
                <option value="course">Course Code</option>
                <option value="title">Title (A–Z)</option>
              </select>
            </div>

            <div className="inline-flex items-center rounded-xl border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Syllabus List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pinned Videos Content */}
      {filteredVideos.length === 0 ? (
        <section className="rounded-2xl border border-border/80 bg-card p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <Pin className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {pinnedVideos.length === 0
                ? 'Your Pinned Lecture Library is Empty'
                : 'No Pinned Lectures Match Your Active Filters'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {pinnedVideos.length === 0
                ? 'Search university lectures in the Discovery Studio and pin them to your courses to build a structured video syllabus.'
                : 'Try switching the course filter back to All Courses or clearing your search keyword.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-1">
            {pinnedVideos.length === 0 ? (
              <Link
                href="/dashboard/youtube"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-xs font-semibold transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Go to Discover Lectures
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveCourseId('all');
                  setStatusTab('all');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 hover:bg-muted px-4 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Reset Library Filters
              </button>
            )}
          </div>
        </section>
      ) : viewMode === 'grid' ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video) => {
            const course = courseMap.get(video.course_id);
            const noteWords = noteWordCounts[video.video_id] || 0;

            return (
              <article
                key={video.id}
                className="rounded-2xl border border-border/80 bg-card overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all group"
              >
                <div>
                  <div
                    onClick={() => handleOpenWatchStudio(video)}
                    className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold shadow-lg">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Open Study Studio
                      </span>
                    </div>

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="rounded-md bg-black/75 backdrop-blur-xs text-white border border-white/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                        {course?.course_code || 'GENERAL'}
                      </span>
                      {noteWords > 0 && (
                        <span className="rounded-md bg-sky-500/90 text-white px-2 py-0.5 text-[10px] font-mono font-bold">
                          {noteWords}w notes
                        </span>
                      )}
                    </div>

                    {video.watched && (
                      <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/95 text-white px-2 py-0.5 text-[10px] font-mono font-bold shadow">
                        <CheckCircle2 className="w-3 h-3" />
                        Watched
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
                      <span className="truncate font-semibold text-foreground/85">
                        {video.channel || 'University Lecture'}
                      </span>
                      {video.pinned_at && (
                        <span className="shrink-0">
                          {new Date(video.pinned_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => handleOpenWatchStudio(video)}
                      className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
                      title={video.title}
                    >
                      {video.title}
                    </h3>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-2.5">
                  {courses.length > 0 && (
                    <select
                      value={video.course_id || ''}
                      onChange={(e) => void handleReassignCourse(video, e.target.value)}
                      aria-label="Course assignment"
                      className="w-full rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.course_code} — {c.title}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleToggleWatched(video)}
                      disabled={busyVideoId === video.id}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                        video.watched
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'
                          : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                      )}
                    >
                      {video.watched ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Watched
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                          Mark Watched
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWatchStudio(video)}
                      className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary p-1.5 transition-colors cursor-pointer"
                      title="Open in Watch & Notes Studio"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleUnpin(video)}
                      disabled={busyVideoId === video.id}
                      className="inline-flex items-center justify-center rounded-lg border border-border hover:border-red-500/40 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 p-1.5 transition-colors cursor-pointer"
                      title="Unpin lecture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* Syllabus List View */
        <section className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <div className="divide-y divide-border/60">
            {filteredVideos.map((video) => {
              const course = courseMap.get(video.course_id);
              const noteWords = noteWordCounts[video.video_id] || 0;

              return (
                <div
                  key={video.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      onClick={() => handleOpenWatchStudio(video)}
                      className="relative w-32 aspect-video rounded-xl overflow-hidden bg-black border border-border shrink-0 cursor-pointer group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary/10 border border-primary/25 text-primary px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                          {course?.course_code || 'COURSE'}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground truncate">
                          {video.channel}
                        </span>
                        {noteWords > 0 && (
                          <span className="rounded-md bg-sky-500/10 border border-sky-500/25 text-sky-500 px-2 py-0.5 text-[10px] font-mono font-semibold">
                            {noteWords} words in notes
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => handleOpenWatchStudio(video)}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                      >
                        {video.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleToggleWatched(video)}
                      disabled={busyVideoId === video.id}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                        video.watched
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                          : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                      )}
                    >
                      {video.watched ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Watched
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                          Mark Watched
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWatchStudio(video)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Study
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleUnpin(video)}
                      disabled={busyVideoId === video.id}
                      className="inline-flex items-center justify-center rounded-xl border border-border hover:border-red-500/40 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 p-2 transition-colors cursor-pointer"
                      title="Unpin lecture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

