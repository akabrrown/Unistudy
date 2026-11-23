'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Clock, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';

interface ExamEvent {
  id: string;
  title: string;
  date: string;
  type: 'exam' | 'assignment' | 'session';
  time?: string;
  course_id?: string | null;
}

interface ExamUrgencyRadarProps {
  events: ExamEvent[];
}

export function ExamUrgencyRadar({ events }: ExamUrgencyRadarProps) {
  const now = new Date();
  const sortedExams = events
    .filter((e) => e.type === 'exam' || e.type === 'assignment')
    .map((e) => {
      const examDate = new Date(e.date);
      const diffMs = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        ...e,
        daysLeft,
      };
    })
    .filter((e) => e.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  if (sortedExams.length === 0) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/80 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="w-4 h-4 text-[#D89A06]" />
          <span>No upcoming exam deadlines queued.</span>
        </div>
        <Link
          href="/dashboard/calendar"
          className="font-bold text-[#00004E] dark:text-[#D89A06] hover:underline text-[11px] uppercase tracking-wider"
        >
          Add to Timetable &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5 font-bold text-[#00004E] dark:text-white">
          <AlertCircle className="w-3.5 h-3.5 text-[#D89A06]" />
          Exam &amp; Assessment Radar
        </span>
        <Link href="/dashboard/calendar" className="text-[11px] font-bold text-[#D89A06] hover:underline">
          View All &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {sortedExams.map((exam) => {
          const isUrgent = exam.daysLeft <= 3;
          const isWarning = exam.daysLeft <= 7 && !isUrgent;

          return (
            <Link
              key={exam.id}
              href="/dashboard/calendar"
              className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                isUrgent
                  ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500 hover:bg-rose-500/10'
                  : isWarning
                  ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10'
                  : 'border-[#00004E]/20 bg-muted/20 hover:border-[#D89A06] hover:bg-[#FEF8E7]/40 dark:hover:bg-white/5'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isUrgent
                        ? 'bg-rose-500 animate-ping'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground truncate">
                    {exam.type}
                  </span>
                </div>
                <div className="text-xs font-bold text-foreground truncate">{exam.title}</div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-block font-mono text-xs font-black px-2 py-0.5 rounded-md ${
                    isUrgent
                      ? 'bg-rose-500 text-white'
                      : isWarning
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-[#00004E]/10 dark:bg-white/10 text-[#00004E] dark:text-[#D89A06]'
                  }`}
                >
                  {exam.daysLeft === 0 ? 'Today!' : `${exam.daysLeft}d left`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
