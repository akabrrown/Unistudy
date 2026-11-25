'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  BrainCircuit,
  BookOpen,
  Award,
  CalendarDays,
  Clock,
  Calculator,
  Camera,
  FileText,
  PlaySquare,
  LineChart,
  User,
  CreditCard,
  Accessibility,
  Shield,
  Users,
  Cpu,
  Mail,
  Activity,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: 'Study Workspace' | 'Academic Tools' | 'Settings' | 'Admin Portal';
  icon: React.ElementType;
  keywords?: string;
}

const BASE_COMMANDS: CommandItem[] = [
  { id: 'dash', label: 'Student Command Center', hint: 'Overview, study rings & courses', href: '/dashboard', group: 'Study Workspace', icon: LayoutDashboard, keywords: 'home dashboard' },
  { id: 'chat', label: 'AI Study Tutor', hint: 'Ask questions grounded in slides', href: '/dashboard/chat', group: 'Study Workspace', icon: BrainCircuit, keywords: 'tutor chat ask explain' },
  { id: 'courses', label: 'Courses & Syllabus', hint: 'Manage enrolled UPSA courses', href: '/dashboard/courses', group: 'Study Workspace', icon: BookOpen, keywords: 'modules classes' },
  { id: 'lectures', label: 'Lecture Slide Decks', hint: 'Browse all uploaded PDF decks', href: '/dashboard/lectures', group: 'Study Workspace', icon: BookOpen, keywords: 'slides pdf' },
  { id: 'papers', label: 'Past Exam Papers', hint: 'Timed mocks & examiner grading', href: '/dashboard/past-papers', group: 'Study Workspace', icon: Award, keywords: 'pasco questions exams' },
  { id: 'calendar', label: 'Timetable & Calendar', hint: 'Weekly class grid & exam dates', href: '/dashboard/calendar', group: 'Study Workspace', icon: CalendarDays, keywords: 'schedule nusmods' },
  { id: 'focus', label: 'Deep Focus Timer', hint: 'Pomodoro timer & ambient study soundscape', href: '/dashboard/focus', group: 'Academic Tools', icon: Clock, keywords: 'pomodoro study session' },
  { id: 'calc', label: 'Math & Graph Studio', hint: 'Step-by-step CAS & 2mm coordinate plotter', href: '/dashboard/calculator', group: 'Academic Tools', icon: Calculator, keywords: 'calculus algebra plot' },
  { id: 'scanner', label: 'Handwritten Notes Scanner', hint: 'Convert notebook pages to LaTeX & notes', href: '/dashboard/scanner', group: 'Academic Tools', icon: Camera, keywords: 'ocr camera photo' },
  { id: 'essay', label: 'Academic Essay Grader', hint: 'Rubric feedback & honors exemplar', href: '/dashboard/essay-grader', group: 'Academic Tools', icon: FileText, keywords: 'writing draft' },
  { id: 'youtube', label: 'YouTube Lecture Study', hint: 'Timestamped video notes & pinned library', href: '/dashboard/youtube', group: 'Academic Tools', icon: PlaySquare, keywords: 'videos watch' },
  { id: 'analytics', label: 'Study Analytics', hint: 'Consistency heatmap & peak focus hours', href: '/dashboard/analytics', group: 'Study Workspace', icon: LineChart, keywords: 'stats progress' },
  { id: 'profile', label: 'Academic Profile & Tutor Style', hint: 'Programme, level & learning preferences', href: '/dashboard/settings/profile', group: 'Settings', icon: User },
  { id: 'billing', label: 'Passes, Credits & Billing', hint: 'Mobile Money top-ups & usage ledger', href: '/dashboard/settings/billing', group: 'Settings', icon: CreditCard, keywords: 'momo paystack' },
  { id: 'a11y', label: 'Accessibility & Reading Preferences', hint: 'Font scale, contrast, reading ruler', href: '/dashboard/settings/accessibility', group: 'Settings', icon: Accessibility },
];

const ADMIN_COMMANDS: CommandItem[] = [
  { id: 'adm-home', label: 'Admin Overview', hint: 'Platform health & live activity', href: '/admin', group: 'Admin Portal', icon: Shield },
  { id: 'adm-users', label: 'User Directory', hint: 'Manage student & admin accounts', href: '/admin/users', group: 'Admin Portal', icon: Users },
  { id: 'adm-subs', label: 'Subscriptions & Revenue', hint: 'Paystack ledger & tier telemetry', href: '/admin/subscriptions', group: 'Admin Portal', icon: CreditCard },
  { id: 'adm-ai', label: 'AI Model Gateway', hint: 'Providers, routing & token usage', href: '/admin/ai-infrastructure', group: 'Admin Portal', icon: Cpu },
  { id: 'adm-ann', label: 'Campus Announcements', hint: 'Broadcast banners to students', href: '/admin/announcements', group: 'Admin Portal', icon: Mail },
  { id: 'adm-audit', label: 'Security Audit Log', hint: 'Append-only administrative trail', href: '/admin/audit', group: 'Admin Portal', icon: Activity },
];

export const OPEN_COMMAND_PALETTE_EVENT = 'unistudy-open-command-palette';

export function triggerCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
  }
}

export function CommandPaletteModal({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const allCommands = useMemo(
    () => (isAdmin ? [...BASE_COMMANDS, ...ADMIN_COMMANDS] : BASE_COMMANDS),
    [isAdmin]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  }, [allCommands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustomOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    } else {
      setQuery('');
    }
  }, [open]);

  const executeSelection = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    const totalOptions = filtered.length + (query.trim().length > 0 ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalOptions > 0) setActiveIndex((i) => (i + 1) % totalOptions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalOptions > 0) setActiveIndex((i) => (i - 1 + totalOptions) % totalOptions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim().length > 0 && activeIndex === filtered.length) {
        executeSelection(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
      } else if (filtered[activeIndex]) {
        executeSelection(filtered[activeIndex].href);
      } else if (query.trim().length > 0) {
        executeSelection(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 sm:max-w-xl overflow-hidden border-border/80 bg-card shadow-2xl">
        <DialogTitle className="sr-only">Quick Jump and Academic Search</DialogTitle>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <Search className="w-4 h-4 text-[#D89A06] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Jump to any page or search slides, flashcards & past papers..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => executeSelection(item.href)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-[#00004E] text-white dark:bg-[#D89A06]/15 dark:text-white'
                    : 'text-foreground hover:bg-muted/60'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      isSelected ? 'text-[#D89A06]' : 'text-muted-foreground'
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                    <div
                      className={cn(
                        'text-[11px] truncate',
                        isSelected ? 'text-white/75 dark:text-muted-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {item.hint}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-mono shrink-0',
                    isSelected ? 'text-[#D89A06]' : 'text-muted-foreground/70'
                  )}
                >
                  {item.group}
                </span>
              </button>
            );
          })}

          {query.trim().length > 0 && (
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(filtered.length)}
              onClick={() => executeSelection(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer border-t border-border/50 mt-1',
                activeIndex === filtered.length
                  ? 'bg-[#00004E] text-white dark:bg-[#D89A06]/15 dark:text-white'
                  : 'text-foreground hover:bg-muted/60'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-[#D89A06] shrink-0" />
                <span className="text-xs font-semibold truncate">
                  Search slides, flashcards &amp; past papers for &ldquo;{query.trim()}&rdquo;
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#D89A06] shrink-0" />
            </button>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border/60 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono px-1 rounded bg-background border border-border text-[10px]">↑↓</kbd> Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Open
            </span>
          </div>
          <span className="font-mono text-[10px]">UniStudy Quick Jump</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
