'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  PlaySquare,
  Play,
  Pin,
  Clock,
  CheckCircle2,
  BookOpen,
  Sparkles,
  SlidersHorizontal,
  ExternalLink,
  Link2,
  History,
  X,
  ArrowUpRight,
  BookmarkCheck,
  GraduationCap,
  Layers,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface CourseOption {
  id: string;
  title: string;
  course_code: string;
}

export interface PinnedVideoRecord {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  thumbnail_url: string;
  watched: boolean;
  course_id: string;
  pinned_at?: string;
}

interface YouTubeResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  description: string;
  publishedAt?: string | null;
}

type SearchAcademicMode = 'lecture' | 'tutorial' | 'exam' | 'raw';
type SearchDuration = 'any' | 'long' | 'medium' | 'short';
type SearchOrder = 'relevance' | 'viewCount' | 'rating' | 'date';

const RECENT_SEARCHES_KEY = 'unistudy_yt_recent_searches_v1';

const CURATED_ACADEMIC_TOPICS = [
  { label: 'Linear Algebra & Eigenvalues', query: 'MIT 18.06 Linear Algebra Eigenvalues Eigenvectors' },
  { label: 'Dynamic Programming', query: 'Algorithms Dynamic Programming Memoization Lecture' },
  { label: 'Organic Reaction Mechanisms', query: 'Organic Chemistry SN1 SN2 E1 E2 Mechanisms' },
  { label: 'Macroeconomic IS-LM Model', query: 'Macroeconomics IS-LM Monetary Fiscal Policy Lecture' },
  { label: 'Operating Systems Concurrency', query: 'Operating Systems Threads Locks Semaphores Deadlock' },
  { label: 'Differential Equations & Laplace', query: 'Differential Equations Laplace Transform Lecture' },
];

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split('/').filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'v');
      if (embedIdx !== -1 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function YouTubeStudyClient({
  courses,
  initialPinnedVideos,
}: {
  courses: CourseOption[];
  initialPinnedVideos: PinnedVideoRecord[];
}) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [academicMode, setAcademicMode] = useState<SearchAcademicMode>('lecture');
  const [durationFilter, setDurationFilter] = useState<SearchDuration>('any');
  const [sortOrder, setSortOrder] = useState<SearchOrder>('relevance');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeQueryLabel, setActiveQueryLabel] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeResult[]>([]);

  const [pinnedVideos, setPinnedVideos] = useState<PinnedVideoRecord[]>(initialPinnedVideos);
  const [selectedCourseByVideo, setSelectedCourseByVideo] = useState<Record<string, string>>({});
  const [pinningVideoId, setPinningVideoId] = useState<string | null>(null);

  // Direct URL / Video ID launcher state
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [directTitleInput, setDirectTitleInput] = useState('');
  const [directCourseId, setDirectCourseId] = useState<string>(courses[0]?.id || '');

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = (query: string) => {
    const clean = query.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  const telemetry = useMemo(() => {
    const totalPinned = pinnedVideos.length;
    const watchedCount = pinnedVideos.filter((v) => v.watched).length;
    const completionPct = totalPinned > 0 ? Math.round((watchedCount / totalPinned) * 100) : 0;
    const coursesWithPins = new Set(pinnedVideos.map((v) => v.course_id).filter(Boolean)).size;
    return {
      totalPinned,
      watchedCount,
      completionPct,
      coursesWithPins,
    };
  }, [pinnedVideos]);

  const pinnedByVideoId = useMemo(() => {
    const map = new Map<string, PinnedVideoRecord[]>();
    for (const item of pinnedVideos) {
      const list = map.get(item.video_id) || [];
      list.push(item);
      map.set(item.video_id, list);
    }
    return map;
  }, [pinnedVideos]);

  const executeSearch = async (
    queryToRun: string,
    modeOverride?: SearchAcademicMode,
    durationOverride?: SearchDuration,
    orderOverride?: SearchOrder
  ) => {
    const trimmed = queryToRun.trim();
    if (!trimmed) {
      toast.error('Enter a course topic, theorem, or lecture keyword to search.');
      return;
    }

    const mode = modeOverride ?? academicMode;
    const duration = durationOverride ?? durationFilter;
    const order = orderOverride ?? sortOrder;

    setIsSearching(true);
    setHasSearched(true);
    setActiveQueryLabel(trimmed);
    saveRecentSearch(trimmed);

    try {
      const params = new URLSearchParams({
        q: trimmed,
        maxResults: '12',
        mode,
        duration,
        order,
      });
      const res = await fetch(`/api/youtube/search?${params.toString()}`);
      const data = (await res.json()) as { videos?: YouTubeResult[]; error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to search YouTube lectures');
      }
      setSearchResults(Array.isArray(data.videos) ? data.videos : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to search YouTube';
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeSearch(searchQuery);
  };

  const handleWatchVideo = (video: {
    videoId: string;
    title: string;
    channel?: string;
    courseId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('title', video.title);
    if (video.channel) searchParams.set('channel', video.channel);
    if (video.courseId) searchParams.set('courseId', video.courseId);
    router.push(`/dashboard/youtube/watch/${encodeURIComponent(video.videoId)}?${searchParams.toString()}`);
  };

  const handlePinVideo = async (video: YouTubeResult, targetCourseId?: string) => {
    const courseId = targetCourseId || selectedCourseByVideo[video.videoId] || courses[0]?.id;
    if (!courseId) {
      toast.error('Create a course first before pinning lectures.');
      return;
    }

    setPinningVideoId(video.videoId);
    try {
      const res = await fetch('/api/youtube/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.videoId,
          title: video.title,
          channel: video.channel,
          thumbnail: video.thumbnail,
          courseId,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        alreadyPinned?: boolean;
        video?: PinnedVideoRecord;
        error?: string;
      };
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to pin lecture');
      }

      const courseObj = courses.find((c) => c.id === courseId);
      if (data.alreadyPinned) {
        toast.info(`Already pinned to ${courseObj?.course_code || 'course'}`);
        return;
      }

      const newRecord: PinnedVideoRecord = data.video || {
        id: `${video.videoId}-${courseId}`,
        video_id: video.videoId,
        title: video.title,
        channel: video.channel,
        thumbnail_url: video.thumbnail,
        watched: false,
        course_id: courseId,
        pinned_at: new Date().toISOString(),
      };

      setPinnedVideos((prev) => [newRecord, ...prev]);
      toast.success(`Pinned to ${courseObj?.course_code || 'Pinned Library'}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to pin video');
    } finally {
      setPinningVideoId(null);
    }
  };

  const parsedDirectVideoId = useMemo(() => extractYouTubeId(directUrlInput), [directUrlInput]);

  const handleDirectLaunch = () => {
    if (!parsedDirectVideoId) {
      toast.error('Paste a valid YouTube URL or 11-character Video ID.');
      return;
    }
    handleWatchVideo({
      videoId: parsedDirectVideoId,
      title: directTitleInput.trim() || `YouTube Lecture (${parsedDirectVideoId})`,
      channel: 'Direct Lecture Stream',
      courseId: directCourseId || undefined,
    });
  };

  const handleDirectPin = async () => {
    if (!parsedDirectVideoId) {
      toast.error('Paste a valid YouTube URL or 11-character Video ID.');
      return;
    }
    const courseId = directCourseId || courses[0]?.id;
    if (!courseId) {
      toast.error('Create a course first to pin this video.');
      return;
    }
    await handlePinVideo(
      {
        videoId: parsedDirectVideoId,
        title: directTitleInput.trim() || `YouTube Lecture (${parsedDirectVideoId})`,
        channel: 'Direct Import',
        thumbnail: `https://i.ytimg.com/vi/${parsedDirectVideoId}/hqdefault.jpg`,
        description: 'Imported directly via YouTube URL.',
      },
      courseId
    );
    setDirectUrlInput('');
    setDirectTitleInput('');
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Studio Header & Route Switcher */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-mono uppercase tracking-wider">
            <PlaySquare className="w-3.5 h-3.5" />
            Academic Video Intelligence · Discovery Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Discover University Lectures
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Search peer-reviewed university lectures, concept breakdowns, and worked exam solutions.
            Pin videos directly to your active courses or open them in the synchronized Study Studio.
          </p>
        </div>

        {/* Dedicated Page Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <Link
              href="/dashboard/youtube"
              className="inline-flex items-center gap-2 rounded-lg bg-background text-foreground shadow-xs px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-red-500" />
              Discover Lectures
            </Link>
            <Link
              href="/dashboard/youtube/pinned"
              className="inline-flex items-center gap-2 rounded-lg text-muted-foreground hover:text-foreground px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <Pin className="w-3.5 h-3.5 text-primary" />
              Pinned Library
              <span className="ml-0.5 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-mono font-bold">
                {telemetry.totalPinned}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* 4-Tile Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Pinned Library Vault
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {telemetry.totalPinned}{' '}
              <span className="text-xs font-normal text-muted-foreground">lectures</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Across {telemetry.coursesWithPins} active{' '}
              {telemetry.coursesWithPins === 1 ? 'course' : 'courses'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Pin className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Watch Completion
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {telemetry.completionPct}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {telemetry.watchedCount} of {telemetry.totalPinned} pinned watched
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Enrolled Course Targets
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {courses.length}{' '}
              <span className="text-xs font-normal text-muted-foreground">courses</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {courses.length > 0
                ? courses.slice(0, 3).map((c) => c.course_code).join(', ')
                : 'No courses created yet'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <GraduationCap className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Discovery Mode
            </p>
            <p className="text-lg font-bold font-mono text-foreground mt-0.5 capitalize">
              {academicMode === 'raw' ? 'Exact Query' : `${academicMode}s`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Duration: {durationFilter === 'any' ? 'All lengths' : durationFilter} · Sort:{' '}
              {sortOrder}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Main Search & Direct URL Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Academic Omni-Search Console */}
        <div className="lg:col-span-8 rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-red-500" />
                Academic Lecture Search Engine
              </h2>
              <p className="text-xs text-muted-foreground">
                Automatically prioritizes university seminars, chalkboard derivations, and structured tutorials.
              </p>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border self-start sm:self-auto">
              YouTube Data API v3
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by course code, theorem, or topic (e.g. Fourier Series, Dijkstra's Algorithm)..."
                className="w-full rounded-xl border border-border bg-background pl-10 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              {isSearching ? 'Searching Catalog...' : 'Search Lectures'}
            </button>
          </form>

          {/* Filter Pills Row: Mode, Duration, Sort */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3 text-primary" />
                Pedagogical Format
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
                {(
                  [
                    { id: 'lecture', label: 'Full Lecture' },
                    { id: 'tutorial', label: 'Tutorial' },
                    { id: 'exam', label: 'Exam Prep' },
                    { id: 'raw', label: 'Exact Query' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAcademicMode(item.id);
                      if (searchQuery.trim()) {
                        void executeSearch(searchQuery, item.id, durationFilter, sortOrder);
                      }
                    }}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                      academicMode === item.id
                        ? 'bg-background text-foreground shadow-xs border border-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500" />
                Lecture Duration
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
                {(
                  [
                    { id: 'any', label: 'Any Length' },
                    { id: 'long', label: 'Long (>20m)' },
                    { id: 'medium', label: 'Mid (4–20m)' },
                    { id: 'short', label: 'Brief (<4m)' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDurationFilter(item.id);
                      if (searchQuery.trim()) {
                        void executeSearch(searchQuery, academicMode, item.id, sortOrder);
                      }
                    }}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                      durationFilter === item.id
                        ? 'bg-background text-foreground shadow-xs border border-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3 text-amber-500" />
                Ranking Order
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
                {(
                  [
                    { id: 'relevance', label: 'Relevance' },
                    { id: 'viewCount', label: 'Most Viewed' },
                    { id: 'rating', label: 'Top Rated' },
                    { id: 'date', label: 'Newest' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSortOrder(item.id);
                      if (searchQuery.trim()) {
                        void executeSearch(searchQuery, academicMode, durationFilter, item.id);
                      }
                    }}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                      sortOrder === item.id
                        ? 'bg-background text-foreground shadow-xs border border-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Course-Grounded Topic Chips */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                {courses.length > 0 ? 'Your Enrolled Course Topics' : 'Curated University Lecture Topics'}
              </span>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear recent ({recentSearches.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => {
                    const q = `${course.course_code} ${course.title}`;
                    setSearchQuery(q);
                    void executeSearch(q);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 hover:bg-primary/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  <span className="font-mono font-bold text-primary">{course.course_code}</span>
                  <span className="truncate max-w-[180px] text-muted-foreground">{course.title}</span>
                </button>
              ))}

              {CURATED_ACADEMIC_TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(topic.query);
                    void executeSearch(topic.query);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {topic.label}
                </button>
              ))}
            </div>

            {recentSearches.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 mr-1">
                  <History className="w-3 h-3" />
                  Recent:
                </span>
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSearchQuery(item);
                      void executeSearch(item);
                    }}
                    className="rounded-md border border-border/70 bg-background hover:bg-muted/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Direct YouTube URL / Video ID Studio Importer */}
        <div className="lg:col-span-4 rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Direct Video URL Import
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                Instant Studio
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Have a specific professor&apos;s YouTube link or video ID? Paste it below to launch the
              note-taking studio or pin it directly to a course without searching.
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                  YouTube Link or 11-Char Video ID
                </label>
                <input
                  type="text"
                  value={directUrlInput}
                  onChange={(e) => setDirectUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                  Custom Lecture Title (Optional)
                </label>
                <input
                  type="text"
                  value={directTitleInput}
                  onChange={(e) => setDirectTitleInput(e.target.value)}
                  placeholder="e.g. Week 4 — Eigenvalues & Diagonalization"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {courses.length > 0 && (
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                    Assign to Course
                  </label>
                  <select
                    value={directCourseId}
                    onChange={(e) => setDirectCourseId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {parsedDirectVideoId && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${parsedDirectVideoId}/mqdefault.jpg`}
                    alt="Video preview"
                    className="w-20 aspect-video rounded-lg object-cover border border-border shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-semibold">
                      Detected Video ID: {parsedDirectVideoId}
                    </p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {directTitleInput.trim() || `YouTube Lecture (${parsedDirectVideoId})`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={handleDirectLaunch}
              disabled={!parsedDirectVideoId}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              Open Studio
            </button>
            <button
              type="button"
              onClick={() => void handleDirectPin()}
              disabled={!parsedDirectVideoId || courses.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-40"
            >
              <Pin className="w-3.5 h-3.5 text-primary" />
              Pin to Course
            </button>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PlaySquare className="w-4 h-4 text-red-500" />
              {hasSearched
                ? `Lecture Results for "${activeQueryLabel}"`
                : 'Academic Discovery Feed'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {hasSearched
                ? `Showing ${searchResults.length} curated academic video ${
                    searchResults.length === 1 ? 'result' : 'results'
                  }`
                : 'Select a course chip above or enter a topic to query university lectures.'}
            </p>
          </div>

          {pinnedVideos.length > 0 && (
            <Link
              href="/dashboard/youtube/pinned"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              View all {pinnedVideos.length} pinned lectures in Pinned Library
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-card overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-muted/60" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-24 bg-muted/60 rounded" />
                  <div className="h-4 w-full bg-muted/60 rounded" />
                  <div className="h-4 w-3/4 bg-muted/60 rounded" />
                  <div className="h-8 w-full bg-muted/60 rounded-lg mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchResults.map((video) => {
              const existingPins = pinnedByVideoId.get(video.videoId) || [];
              const isPinned = existingPins.length > 0;
              const selectedCourse =
                selectedCourseByVideo[video.videoId] || courses[0]?.id || '';

              return (
                <article
                  key={video.videoId}
                  className="rounded-2xl border border-border/80 bg-card overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all group"
                >
                  <div>
                    <div
                      onClick={() => handleWatchVideo(video)}
                      className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-3.5 py-1.5 text-xs font-semibold shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Open Study Studio
                        </span>
                      </div>

                      {isPinned && (
                        <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/95 text-white px-2 py-0.5 text-[10px] font-mono font-bold shadow">
                          <BookmarkCheck className="w-3 h-3" />
                          Pinned
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
                        <span className="truncate font-semibold text-foreground/90">
                          {video.channel}
                        </span>
                        {video.publishedAt && (
                          <span className="shrink-0">
                            {new Date(video.publishedAt).getFullYear()}
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => handleWatchVideo(video)}
                        className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
                        title={video.title}
                      >
                        {video.title}
                      </h3>

                      {video.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 space-y-2">
                    {courses.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={selectedCourse}
                          onChange={(e) =>
                            setSelectedCourseByVideo((prev) => ({
                              ...prev,
                              [video.videoId]: e.target.value,
                            }))
                          }
                          aria-label="Select course to pin lecture"
                          className="flex-1 min-w-0 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.course_code} — {c.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handlePinVideo(video, selectedCourse)}
                          disabled={pinningVideoId === video.videoId}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <Pin className="w-3.5 h-3.5" />
                          {pinningVideoId === video.videoId ? '...' : 'Pin'}
                        </button>
                      </div>
                    ) : (
                      <Link
                        href="/dashboard/courses?action=new"
                        className="block text-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-500 hover:bg-amber-500/15"
                      >
                        + Create a Course to Pin Lectures
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleWatchVideo({
                          videoId: video.videoId,
                          title: video.title,
                          channel: video.channel,
                          courseId: selectedCourse || undefined,
                        })
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                      Launch Lecture &amp; Notes Studio
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <PlaySquare className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {hasSearched
                  ? 'No matching lectures returned for this filter combination'
                  : 'Explore University Lectures by Course or Topic'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {hasSearched
                  ? 'Try switching Pedagogical Format to Exact Query or broadening the duration filter.'
                  : 'Click any of your enrolled course chips below to immediately fetch university lecture videos tailored to your syllabus.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {(courses.length > 0
                ? courses.slice(0, 4).map((c) => ({
                    label: `${c.course_code}: ${c.title}`,
                    query: `${c.course_code} ${c.title}`,
                  }))
                : CURATED_ACADEMIC_TOPICS.slice(0, 4)
              ).map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(chip.query);
                    void executeSearch(chip.query);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-red-500" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Recently Pinned Preview Strip */}
      {pinnedVideos.length > 0 && (
        <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Pin className="w-4 h-4 text-primary" />
                Recently Pinned to Your Library
              </h2>
              <p className="text-xs text-muted-foreground">
                Quick access to your most recently saved course lectures. Manage your full queue in the Pinned Library page.
              </p>
            </div>
            <Link
              href="/dashboard/youtube/pinned"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition-colors self-start sm:self-auto"
            >
              Open Full Pinned Library ({pinnedVideos.length})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pinnedVideos.slice(0, 4).map((video) => {
              const course = courses.find((c) => c.id === video.course_id);
              return (
                <div
                  key={video.id}
                  onClick={() =>
                    handleWatchVideo({
                      videoId: video.video_id,
                      title: video.title,
                      channel: video.channel,
                      courseId: video.course_id,
                    })
                  }
                  className="rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 p-3 flex items-center gap-3 cursor-pointer transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-20 aspect-video rounded-lg object-cover border border-border shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                        {course?.course_code || 'COURSE'}
                      </span>
                      {video.watched && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-2 mt-0.5">
                      {video.title}
                    </p>
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
