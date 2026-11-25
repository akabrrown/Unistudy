'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { RadialRing } from '@/components/ui/sparkline';
import { useAppReducedMotion } from '@/lib/motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  Clock,
  FileWarning,
  RefreshCcw,
  LayoutGrid,
  ArrowRight,
  CheckCircle2,
  Search,
  Pencil,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { GenerateScheduleWizard } from '@/components/planner/GenerateScheduleWizard';
import { WeeklyTimetable } from '@/components/planner/WeeklyTimetable';
import { cn } from '@/lib/utils';

type EventType = 'exam' | 'assignment' | 'session';
type FilterType = 'all' | EventType;

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  course_id?: string | null;
}

interface ScheduleTemplateSession {
  start: string;
  end: string;
  label: string;
}

interface ScheduleTemplateDay {
  day: string;
  sessions: ScheduleTemplateSession[];
}

interface ScheduleTemplate {
  semester_start: string;
  semester_end: string;
  weekly_template: ScheduleTemplateDay[];
}

const TYPE_CONFIG: Record<
  EventType,
  { label: string; icon: React.ElementType; text: string; bg: string; border: string; dot: string }
> = {
  exam: {
    label: 'Exam',
    icon: FileWarning,
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-500/12',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
  },
  assignment: {
    label: 'Assignment',
    icon: BookOpen,
    text: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-500/12',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  session: {
    label: 'Study Session',
    icon: Clock,
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-500/12',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatReadableDate(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysBetweenToday(dateStr: string, todayStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const base = new Date(`${todayStr}T00:00:00`);
  return Math.ceil((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view');
  const urlAction = searchParams.get('action');

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [manualView, setManualView] = useState<{
    forUrl: string | null;
    val: 'calendar' | 'timetable';
  } | null>(null);
  const view: 'calendar' | 'timetable' =
    manualView && manualView.forUrl === urlView
      ? manualView.val
      : urlView === 'timetable'
        ? 'timetable'
        : 'calendar';
  const setView = (next: 'calendar' | 'timetable') =>
    setManualView({ forUrl: urlView, val: next });

  const [template, setTemplate] = useState<ScheduleTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [dismissedAddAction, setDismissedAddAction] = useState(false);
  const effectiveIsAdding = isAdding || (urlAction === 'add' && !dismissedAddAction);

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>('exam');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteTimetableOpen, setConfirmDeleteTimetableOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileCalendarTab, setMobileCalendarTab] = useState<'grid' | 'agenda'>('grid');
  const reducedMotion = useAppReducedMotion();

  // Editing state for calendar events
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<EventType>('exam');
  const [isUpdating, setIsUpdating] = useState(false);

  const startEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditDate(ev.date);
    setEditType(ev.type);
  };

  const cancelEditEvent = () => {
    setEditingEvent(null);
    setEditTitle('');
    setEditDate('');
  };

  const handleUpdateEvent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingEvent) return;
    if (!editTitle.trim() || !editDate) {
      toast.error('Please enter an event title and select a date.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEvent.id,
          title: editTitle.trim(),
          date: editDate,
          type: editType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to update event');
      }

      const data = await res.json();
      const updatedEv = (data?.event || {
        ...editingEvent,
        title: editTitle.trim(),
        date: editDate,
        type: editType,
      }) as CalendarEvent;

      setEvents((prev) =>
        prev
          .map((item) => (item.id === updatedEv.id ? updatedEv : item))
          .sort((a, b) => a.date.localeCompare(b.date))
      );

      setSelectedDate(editDate);
      cancelEditEvent();
      toast.success('Event updated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update event');
    } finally {
      setIsUpdating(false);
    }
  };

  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadCalendarAndTemplate = async (): Promise<{
    nextEvents: CalendarEvent[] | null;
    nextTemplate: ScheduleTemplate | null;
  }> => {
    const [evRes, tplRes] = await Promise.allSettled([
      fetch('/api/calendar').then(async (r) => (r.ok ? r.json() : null)),
      fetch('/api/planner/template').then(async (r) => (r.ok ? r.json() : null)),
    ]);

    const nextEvents =
      evRes.status === 'fulfilled' && evRes.value && Array.isArray(evRes.value.events)
        ? (evRes.value.events as CalendarEvent[])
        : null;
    const nextTemplate =
      tplRes.status === 'fulfilled' && tplRes.value ? (tplRes.value.template as ScheduleTemplate | null) : null;

    return { nextEvents, nextTemplate };
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const { nextEvents, nextTemplate } = await loadCalendarAndTemplate();
      if (nextEvents) {
        setEvents(nextEvents);
      } else {
        setLoadError('Could not load your calendar events.');
      }
      setTemplate(nextTemplate);
    } catch (err) {
      console.error('Failed to refresh calendar', err);
      setLoadError('Could not load your calendar events.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const { nextEvents, nextTemplate } = await loadCalendarAndTemplate();
        if (!active) return;
        if (nextEvents) {
          setEvents(nextEvents);
        } else {
          setLoadError('Could not load your calendar events.');
        }
        setTemplate(nextTemplate);
      } catch (err) {
        console.error('Failed to initialize calendar', err);
        if (active) setLoadError('Could not load your calendar events.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const handleDeleteTimetable = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/planner/template', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete timetable');
      toast.success('Timetable deleted');
      setTemplate(null);
      setConfirmDeleteTimetableOpen(false);
      await refreshData();
      setView('calendar');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete timetable');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddEvent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newEventTitle.trim() || !selectedDate) {
      toast.error('Please enter an event title and select a date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEventTitle.trim(),
          type: newEventType,
          date: selectedDate,
        }),
      });
      if (!res.ok) throw new Error('Failed to add event');

      const data = await res.json();
      if (data?.event) {
        setEvents((prev) =>
          [...prev, data.event as CalendarEvent].sort((a, b) => a.date.localeCompare(b.date))
        );
      }
      setNewEventTitle('');
      setIsAdding(false);
      if (urlAction === 'add') {
        setDismissedAddAction(true);
        router.replace('/dashboard/calendar');
      }
      toast.success('Event added to calendar');
    } catch {
      toast.error('Could not add event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = [...events];
    setEvents((curr) => curr.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast('Event removed');
    } catch {
      setEvents(prev);
      toast.error('Could not delete event');
    }
  };

  const todayDateString = useMemo(() => toDateStr(new Date()), []);
  const monthName = currentDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const calendarDays = useMemo(() => {
    const yr = currentDate.getFullYear();
    const mo = currentDate.getMonth();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const firstDay = new Date(yr, mo, 1).getDay();

    const list: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) list.push(null);
    for (let i = 1; i <= daysInMonth; i++) list.push(new Date(yr, mo, i));
    return list;
  }, [currentDate]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false;
      if (q && !ev.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, typeFilter, searchQuery]);

  const upcomingExams = useMemo(
    () =>
      events
        .filter((ev) => ev.type === 'exam' && ev.date >= todayDateString)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, todayDateString]
  );

  const upcomingAssignments = useMemo(
    () =>
      events.filter((ev) => ev.type === 'assignment' && ev.date >= todayDateString),
    [events, todayDateString]
  );

  const monthSessionCount = useMemo(
    () =>
      events.filter((ev) => ev.type === 'session' && ev.date.startsWith(currentMonthKey)).length,
    [events, currentMonthKey]
  );

  const selectedDayEvents = useMemo(
    () => filteredEvents.filter((ev) => ev.date === selectedDate),
    [filteredEvents, selectedDate]
  );

  const upcomingAgenda = useMemo(
    () =>
      filteredEvents
        .filter((ev) => ev.date >= todayDateString)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8),
    [filteredEvents, todayDateString]
  );

  const nearestExamDays = upcomingExams[0]
    ? Math.max(0, daysBetweenToday(upcomingExams[0].date, todayDateString))
    : null;

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      {/* Compact Calendar Toolbar (No 4-Card Schedule Telemetry Strip) */}
      <header className="rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Study Calendar
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold">
                <strong className="font-mono">{upcomingExams.length}</strong> Exams
                {nearestExamDays !== null ? ` (${nearestExamDays}d)` : ''}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold">
                <strong className="font-mono">{upcomingAssignments.length}</strong> Assignments
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {template ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteTimetableOpen(true)}
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Delete Timetable
              </Button>
            ) : null}

            <GenerateScheduleWizard
              onSuccess={() => {
                void refreshData();
                setView('timetable');
              }}
            />

            <Button
              size="sm"
              onClick={() => {
                setSelectedDate(todayDateString);
                setIsAdding(true);
              }}
              className="h-9 px-4 text-xs font-semibold bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>
        </div>

        {/* View Toggle & Event Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setView('calendar');
                  void refreshData();
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                  view === 'calendar'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                Live Calendar
              </button>
              <button
                type="button"
                onClick={() => setView('timetable')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                  view === 'timetable'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                Weekly Timetable
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshData()}
              disabled={isRefreshing}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCcw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {view === 'calendar' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter events..."
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'exam', label: 'Exams' },
                    { key: 'assignment', label: 'Tasks' },
                    { key: 'session', label: 'Sessions' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTypeFilter(item.key)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                      typeFilter === item.key
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* Error Banner */}
      {loadError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshData()}
            className="h-8 text-xs cursor-pointer"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Mobile Grid / Agenda Switcher */}
      {!loading && view === 'calendar' && (
        <div className="lg:hidden flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setMobileCalendarTab('grid')}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
              mobileCalendarTab === 'grid'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground'
            )}
          >
            Month Grid
          </button>
          <button
            type="button"
            onClick={() => setMobileCalendarTab('agenda')}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
              mobileCalendarTab === 'agenda'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground'
            )}
          >
            Day &amp; Exam Agenda ({upcomingAgenda.length})
          </button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Skeleton className="lg:col-span-8 h-[600px] rounded-2xl" />
          <div className="lg:col-span-4 space-y-5">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : view === 'timetable' ? (
        <WeeklyTimetable
          template={
            template || { semester_start: '', semester_end: '', weekly_template: [] }
          }
          onUpdate={() => {
            void refreshData();
            setView('calendar');
          }}
        />
      ) : (
        /* Split-Screen Notion Calendar x Motion Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Calendar Grid (8 cols) */}
          <section
            className={cn(
              'lg:col-span-8 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4',
              mobileCalendarTab === 'agenda' && 'hidden lg:block'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight text-foreground">{monthName}</h2>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Exam
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Assignment
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Session
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    setCurrentDate(now);
                    setSelectedDate(toDateStr(now));
                  }}
                  className="h-8 px-3 text-xs cursor-pointer"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous month"
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
                  }
                  className="cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next month"
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
                  }
                  className="cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentMonthKey}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border"
              >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="bg-muted/60 py-2 px-1 text-center text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="bg-muted/20 min-h-[104px]" />;
                }

                const dateStr = toDateStr(date);
                const isToday = dateStr === todayDateString;
                const isSelected = dateStr === selectedDate;
                const dayEvents = filteredEvents.filter((ev) => ev.date === dateStr);
                const visibleEvents = dayEvents.slice(0, 3);
                const overflowCount = Math.max(0, dayEvents.length - visibleEvents.length);

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      'bg-card min-h-[104px] p-1.5 sm:p-2 transition-colors cursor-pointer flex flex-col justify-between group',
                      isSelected ? 'ring-2 ring-inset ring-primary bg-primary/[0.04]' : 'hover:bg-muted/35',
                      isToday && !isSelected && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'text-xs font-mono font-semibold w-6 h-6 flex items-center justify-center rounded-full tabular-nums',
                          isToday
                            ? 'bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] text-white'
                            : isSelected
                              ? 'bg-primary/15 text-primary'
                              : 'text-foreground'
                        )}
                      >
                        {date.getDate()}
                      </span>

                      {dayEvents.length > 0 ? (
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                          {dayEvents.length}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(dateStr);
                            setIsAdding(true);
                          }}
                          aria-label={`Quick add event on ${dateStr}`}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-0.5 rounded transition-opacity cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {visibleEvents.map((ev) => {
                        const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.session;
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={ev.id}
                            title={ev.title}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              'text-[11px] px-1.5 py-0.5 rounded border flex items-center justify-between gap-1 group/ev',
                              cfg.bg,
                              cfg.border,
                              cfg.text
                            )}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <Icon className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate font-medium">{ev.title}</span>
                            </div>
                            <div className="opacity-100 sm:opacity-0 sm:group-hover/ev:opacity-100 flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditEvent(ev);
                                }}
                                aria-label={`Edit ${ev.title}`}
                                className="hover:text-primary cursor-pointer p-0.5 transition-colors"
                                title="Edit event"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDelete(ev.id);
                                }}
                                aria-label={`Delete ${ev.title}`}
                                className="hover:text-destructive shrink-0 cursor-pointer p-0.5 transition-colors"
                                title="Delete event"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {overflowCount > 0 ? (
                        <div className="text-[10px] font-mono font-semibold text-primary px-1">
                          +{overflowCount} more
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              </motion.div>
            </AnimatePresence>
          </section>

          {/* Right Context & Agenda Rail (4 cols) */}
          <aside
            className={cn(
              'lg:col-span-4 space-y-5',
              mobileCalendarTab === 'grid' && 'hidden lg:block'
            )}
          >
            {/* Selected Day Inspector + Quick Capture */}
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                    Selected Day
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-0.5">
                    {formatReadableDate(selectedDate)}
                  </h3>
                </div>
                <Button
                  type="button"
                  variant={effectiveIsAdding ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (effectiveIsAdding) {
                      setIsAdding(false);
                      if (urlAction === 'add') {
                        setDismissedAddAction(true);
                        router.replace('/dashboard/calendar');
                      }
                    } else {
                      setIsAdding(true);
                    }
                  }}
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  {effectiveIsAdding ? 'Close' : 'Quick Add'}
                </Button>
              </div>

              {/* Quick Capture Form */}
              <form
                onSubmit={(e) => void handleAddEvent(e)}
                className={cn(
                  'rounded-xl border border-border bg-muted/25 p-3 space-y-2.5',
                  !effectiveIsAdding && 'hidden'
                )}
              >
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                    Event Title
                  </label>
                  <Input
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="e.g. Organic Chemistry Midterm"
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['exam', 'assignment', 'session'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewEventType(t)}
                        className={cn(
                          'py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer',
                          newEventType === t
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t === 'session' ? 'Session' : t === 'exam' ? 'Exam' : 'Task'}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !newEventTitle.trim()}
                  className="w-full h-8 text-xs bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Save to {selectedDate}
                </Button>
              </form>

              {/* Events for selected date */}
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">No events scheduled for this day.</p>
                  {!effectiveIsAdding ? (
                    <button
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      + Add exam, assignment, or study block
                    </button>
                  ) : null}
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedDayEvents.map((ev) => {
                    const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.session;
                    const Icon = cfg.icon;
                    return (
                      <li
                        key={ev.id}
                        className={cn(
                          'rounded-xl border p-2.5 flex items-center justify-between gap-2',
                          cfg.bg,
                          cfg.border
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={cn('w-4 h-4 shrink-0', cfg.text)} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">
                              {ev.title}
                            </div>
                            <div className={cn('text-[10px] font-mono uppercase', cfg.text)}>
                              {cfg.label}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditEvent(ev)}
                            aria-label={`Edit ${ev.title}`}
                            className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-muted/60 transition-colors cursor-pointer"
                            title="Edit event"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(ev.id)}
                            aria-label={`Remove ${ev.title}`}
                            className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted/60 transition-colors cursor-pointer"
                            title="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Urgent Exam Countdowns */}
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Exam Countdowns
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ranked by nearest examination window
                  </p>
                </div>
                <Link
                  href="/dashboard/past-papers"
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Past Papers
                </Link>
              </div>

              {upcomingExams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                  <p className="text-xs font-medium text-foreground">No exams queued</p>
                  <p className="text-[11px] text-muted-foreground">
                    Add your midterm or final exam dates to track days left and trigger AI check-ins.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {upcomingExams.slice(0, 5).map((exam) => {
                    const daysLeft = Math.max(0, daysBetweenToday(exam.date, todayDateString));
                    const ringColor =
                      daysLeft <= 7 ? '#F43F5E' : daysLeft <= 14 ? '#D89A06' : '#10B981';
                    const ringPct = Math.max(8, Math.min(100, Math.round(((30 - Math.min(30, daysLeft)) / 30) * 100)));

                    return (
                      <li
                        key={exam.id}
                        onClick={() => {
                          setSelectedDate(exam.date);
                          const d = new Date(`${exam.date}T00:00:00`);
                          if (!Number.isNaN(d.getTime())) setCurrentDate(d);
                        }}
                        className="rounded-xl border border-border/70 bg-muted/25 hover:border-primary/40 p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {exam.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatReadableDate(exam.date)}
                          </div>
                        </div>
                        <RadialRing
                          value={ringPct}
                          size={38}
                          strokeWidth={3.5}
                          color={ringColor}
                          label={`${daysLeft}d`}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Upcoming Agenda Timeline */}
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Upcoming Agenda
                </h3>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {upcomingAgenda.length} items
                </span>
              </div>

              {upcomingAgenda.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Nothing upcoming matches the current filter.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {upcomingAgenda.map((ev) => {
                    const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.session;
                    return (
                      <li
                        key={ev.id}
                        onClick={() => {
                          setSelectedDate(ev.date);
                          const d = new Date(`${ev.date}T00:00:00`);
                          if (!Number.isNaN(d.getTime())) setCurrentDate(d);
                        }}
                        className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot)} />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                              {ev.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                              {formatReadableDate(ev.date)}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      {/* Edit Event Dialog */}
      <Dialog open={Boolean(editingEvent)} onOpenChange={(open) => !open && cancelEditEvent()}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-card p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00004E]/10 dark:bg-[#D89A06]/15 flex items-center justify-center text-[#00004E] dark:text-[#D89A06]">
                <Pencil className="w-4 h-4" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-bold text-foreground">
                  Edit Calendar Event
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Modify title, scheduled date, or event category.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={(e) => void handleUpdateEvent(e)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Event Title
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Financial Accounting Midterm"
                className="bg-background text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Scheduled Date
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#D89A06]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['exam', 'assignment', 'session'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditType(t)}
                    className={cn(
                      'py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      editType === t
                        ? 'border-[#00004E] bg-[#00004E]/10 text-[#00004E] dark:border-[#D89A06] dark:bg-[#D89A06]/15 dark:text-[#D89A06]'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t === 'exam' ? 'Exam' : t === 'assignment' ? 'Assignment' : 'Session'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditEvent}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !editTitle.trim() || !editDate}
                className="bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer text-xs gap-1.5"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmDeleteTimetableOpen}
        onOpenChange={setConfirmDeleteTimetableOpen}
        title="Delete weekly study timetable?"
        description="This removes your generated study timetable template and its recurring study blocks from your calendar."
        confirmLabel="Delete Timetable"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteTimetable}
      />
    </div>
  );
}
