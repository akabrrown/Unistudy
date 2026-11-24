'use client';
import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, BookOpen, Edit2, Save, Loader2, X, AlertTriangle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollegiateLibraryIllustration } from '@/components/illustrations';
import { toast } from 'sonner';

interface Session {
  start: string;
  end: string;
  label: string;
}

interface DaySchedule {
  day: string;
  sessions: Session[];
}

interface WeeklyTimetableProps {
  template: {
    semester_start: string;
    semester_end: string;
    weekly_template: DaySchedule[];
  };
  onUpdate?: () => void;
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function WeeklyTimetable({ template, onUpdate }: WeeklyTimetableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<DaySchedule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'matrix' | 'agenda'>('matrix');

  useEffect(() => {
    if (template && template.weekly_template) {
      // Merge logic
      const mergedDays = template.weekly_template.reduce((acc: any[], current: any) => {
        const dayName = current.day.toLowerCase();
        const existing = acc.find((item: any) => item.day === dayName);
        if (existing) {
          existing.sessions = [...existing.sessions, ...(current.sessions || [])];
        } else {
          acc.push({ ...current, day: dayName, sessions: current.sessions || [] });
        }
        return acc;
      }, []);

      const sorted = mergedDays.sort((a: any, b: any) => 
        DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
      );

      setEditedTemplate(sorted);

      // Extract unique courses
      const courses = new Set<string>();
      sorted.forEach((day: DaySchedule) => {
        day.sessions.forEach(s => courses.add(s.label));
      });
      setAvailableCourses(Array.from(courses));
    }
  }, [template]);

  // Compute total weekly lecture hours
  const totalWeeklySessions = useMemo(() => {
    return editedTemplate.reduce((acc, d) => acc + d.sessions.length, 0);
  }, [editedTemplate]);

  if (!template || !template.weekly_template || template.weekly_template.length === 0) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-12 text-center flex flex-col items-center space-y-4 shadow-xs">
        <CollegiateLibraryIllustration className="w-52 h-32" />
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-lg font-bold text-foreground">No Academic Timetable Configured</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate your semester class schedule or sync course lecture periods to preview weekly study intervals, tutorial slots, and exam clash alerts.
          </p>
        </div>
      </div>
    );
  }

  const handleCourseChange = (dayIndex: number, sessionIndex: number, newLabel: string) => {
    setEditedTemplate(prev => {
      const copy = [...prev];
      copy[dayIndex] = { ...copy[dayIndex], sessions: [...copy[dayIndex].sessions] };
      copy[dayIndex].sessions[sessionIndex] = { ...copy[dayIndex].sessions[sessionIndex], label: newLabel };
      return copy;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/planner/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedTemplate: editedTemplate })
      });
      if (!res.ok) throw new Error('Failed to save timetable');
      toast.success('Timetable updated successfully!');
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (e: any) {
      toast.error(e.message || 'Error updating timetable');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* NUSMods Academic Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <CalendarIcon className="w-4 h-4 text-[#D89A06]" />
            Semester Period:
          </span>
          <span className="font-mono font-medium text-foreground">
            {new Date(template.semester_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {' – '}
            {new Date(template.semester_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
          <span className="text-muted-foreground/50" aria-hidden="true">·</span>
          <span className="font-mono font-bold text-[#00004E] dark:text-[#D89A06]">
            {totalWeeklySessions} Weekly Slots
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'matrix' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Time Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'agenda' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Day Agenda
            </button>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-xs h-8">
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] text-xs h-8 font-bold">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-xs h-8 cursor-pointer">
              <Edit2 className="w-3.5 h-3.5 mr-1 text-[#D89A06]" /> Edit Schedule
            </Button>
          )}
        </div>
      </div>

      {/* NUSMods Time Grid View */}
      {viewMode === 'matrix' ? (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {editedTemplate.map((dayData, dayIndex) => (
              <div key={dayData.day} className="flex flex-col min-w-0">
                <div className="p-3 bg-muted/40 border-b border-border/60 text-center">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00004E] dark:text-[#D89A06]">
                    {dayData.day.slice(0, 3)}
                  </span>
                </div>

                <div className="p-2 flex-1 space-y-2 min-h-[220px]">
                  {dayData.sessions.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-3 text-center">
                      <span className="text-[11px] font-mono text-muted-foreground/50">Rest</span>
                    </div>
                  ) : (
                    dayData.sessions.map((session, sessionIndex) => (
                      <div
                        key={sessionIndex}
                        className="rounded-lg border border-[#00004E]/25 dark:border-[#D89A06]/30 bg-muted/20 p-2.5 space-y-1 transition-all hover:border-[#D89A06] hover:bg-[#FEF8E7]/40 dark:hover:bg-white/5"
                      >
                        {isEditing ? (
                          <select 
                            className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none mb-1"
                            value={session.label}
                            onChange={(e) => handleCourseChange(dayIndex, sessionIndex, e.target.value)}
                          >
                            {availableCourses.map(course => (
                              <option key={course} value={course}>{course}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-bold text-xs text-foreground truncate" title={session.label}>
                            {session.label}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                          <Clock className="w-2.5 h-2.5 text-[#D89A06]" />
                          <span>{session.start} – {session.end}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Day Agenda View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {editedTemplate.map((dayData, dayIndex) => (
            <div key={dayData.day} className="bg-card border border-border/80 rounded-xl overflow-hidden flex flex-col shadow-2xs">
              <div className="bg-muted/40 p-3 border-b border-border/60 flex items-center justify-between">
                <h4 className="font-bold text-xs capitalize text-foreground">{dayData.day}</h4>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {dayData.sessions.length} sessions
                </span>
              </div>
              <div className="p-3.5 flex-1 space-y-2.5">
                {dayData.sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No scheduled sessions</p>
                ) : (
                  dayData.sessions.map((session, sessionIndex) => (
                    <div key={sessionIndex} className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-muted/20 border border-border/60">
                      <div className="w-7 h-7 rounded-md bg-[#00004E] text-[#D89A06] dark:bg-white/10 dark:text-[#D89A06] flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <select 
                            className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none mb-1"
                            value={session.label}
                            onChange={(e) => handleCourseChange(dayIndex, sessionIndex, e.target.value)}
                          >
                            {availableCourses.map(course => (
                              <option key={course} value={course}>{course}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="font-bold text-foreground truncate">{session.label}</p>
                        )}
                        <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-[#D89A06]" />
                          {session.start} - {session.end}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
