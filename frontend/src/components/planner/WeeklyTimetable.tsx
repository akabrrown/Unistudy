'use client';
import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, BookOpen, Edit2, Save, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  useEffect(() => {
    if (template && template.weekly_template) {
      // Merge logic
      const mergedDays = template.weekly_template.reduce((acc: any[], current: any) => {
        const dayName = current.day.toLowerCase();
        const existing = acc.find(item => item.day === dayName);
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

  if (!template || !template.weekly_template || template.weekly_template.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <CalendarIcon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No active timetable</h3>
        <p className="text-muted-foreground max-w-md">
          You haven't generated a smart timetable for this semester yet. Use the "Generate smart timetable" button above to get started.
        </p>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> Valid from:</span>
          <span className="font-medium text-foreground">{new Date(template.semester_start).toLocaleDateString()}</span>
          <span>to</span>
          <span className="font-medium text-foreground">{new Date(template.semester_end).toLocaleDateString()}</span>
        </div>
        
        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit Timetable
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {editedTemplate.map((dayData, dayIndex) => (
          <div key={dayData.day} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="bg-muted/50 p-3 border-b border-border">
              <h4 className="font-semibold capitalize text-foreground">{dayData.day}</h4>
            </div>
            <div className="p-4 flex-1 space-y-3">
              {dayData.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Rest day</p>
              ) : (
                dayData.sessions.map((session, sessionIndex) => (
                  <div key={sessionIndex} className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <select 
                          className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-1"
                          value={session.label}
                          onChange={(e) => handleCourseChange(dayIndex, sessionIndex, e.target.value)}
                        >
                          {availableCourses.map(course => (
                            <option key={course} value={course}>{course}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="font-medium text-foreground truncate">{session.label}</p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
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
    </div>
  );
}
