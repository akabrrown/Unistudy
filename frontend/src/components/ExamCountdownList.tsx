'use client';
import { useState, useEffect } from 'react';
import { CalendarIcon, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  course_code: string;
}

interface Exam {
  id: string;
  title: string;
  date: string;
  time?: string;
}

export function ExamCountdownList({ exams, courses }: { exams: Exam[], courses: Course[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update every minute just in case
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!exams || exams.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
        No upcoming exams
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-4">
      {exams.map(exam => {
        // Calculate days left
        const examDate = new Date(`${exam.date}T${exam.time || '00:00:00'}`);
        const diffTime = examDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Match course by title or code
        const matchedCourse = courses?.find(c => 
          exam.title.toLowerCase().includes(c.course_code?.toLowerCase() || '') ||
          exam.title.toLowerCase().includes(c.title?.toLowerCase() || '')
        );

        let colorClass = '';
        let bgClass = '';
        
        if (diffDays <= 7) {
          colorClass = 'text-red-600 dark:text-red-400';
          bgClass = 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50';
        } else if (diffDays <= 14) {
          colorClass = 'text-amber-600 dark:text-amber-500';
          bgClass = 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50';
        } else if (diffDays <= 30) {
          colorClass = 'text-green-600 dark:text-green-500';
          bgClass = 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50';
        } else {
          colorClass = 'text-[#5B2D8E] dark:text-[#D4B3FF]'; // Lavender / Brand color
          bgClass = 'bg-[#FAF8FF] border-[#EBE5F0] dark:bg-[#5B2D8E]/10 dark:border-[#5B2D8E]/20';
        }

        const widgetContent = (
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-transform hover:scale-[1.02] ${bgClass}`}>
            <div>
              <h4 className="font-semibold text-sm line-clamp-1">{exam.title}</h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {new Date(exam.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {exam.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.time}</span>}
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className={`text-xl font-bold leading-none ${colorClass}`}>
                {diffDays < 0 ? 0 : diffDays}
              </span>
              <span className={`text-[10px] font-medium uppercase tracking-wider ${colorClass}`}>
                Days Left
              </span>
            </div>
          </div>
        );

        if (matchedCourse) {
          return (
            <Link key={exam.id} href={`/dashboard/courses/${matchedCourse.id}/past-papers`} className="block group">
              {widgetContent}
            </Link>
          );
        }

        return <div key={exam.id}>{widgetContent}</div>;
      })}
    </div>
  );
}
