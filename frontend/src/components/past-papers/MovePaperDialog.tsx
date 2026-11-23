'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderInput, Check, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { resolveCourseColor } from '@/lib/constants/courses';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { normalizePastPaperTitle } from '@/lib/past-papers/titleNormalizer';

export interface CourseOption {
  id: string;
  course_code: string | null;
  title: string;
  colour?: string | null;
}

export interface PaperToMove {
  id: string;
  title: string | null;
  course_code?: string | null;
  course_id?: string | null;
  courses?: any;
}

interface MovePaperDialogProps {
  isOpen: boolean;
  onClose: () => void;
  paper: PaperToMove | null;
  courses: CourseOption[];
  onSuccess?: (targetCourseId: string, updatedPaper?: any) => void;
}

export function MovePaperDialog({
  isOpen,
  onClose,
  paper,
  courses,
  onSuccess,
}: MovePaperDialogProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (paper) {
      // Find initial course match or leave unselected
      const currentCourseId = paper.course_id || (paper.courses && !paper.courses.isCentral ? paper.courses.id : '');
      setSelectedCourseId(currentCourseId || '');
      setCustomTitle(normalizePastPaperTitle(paper.title) || '');
    }
  }, [paper]);

  if (!paper) return null;

  const currentCourseMeta = Array.isArray(paper.courses) ? paper.courses[0] : paper.courses;
  const currentCourseDisplay =
    currentCourseMeta && !currentCourseMeta.isCentral
      ? `${currentCourseMeta.course_code || ''} — ${currentCourseMeta.title || ''}`
      : paper.course_code
      ? `${paper.course_code} (Unassigned)`
      : 'Unassigned';

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Please select a target course');
      return;
    }

    const targetCourse = courses.find((c) => c.id === selectedCourseId);
    if (!targetCourse) {
      toast.error('Selected course not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/past-questions/${encodeURIComponent(paper.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: customTitle.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to move paper');
      }

      toast.success(data.message || `Moved to ${targetCourse.course_code}: ${targetCourse.title}`);
      onSuccess?.(selectedCourseId, data.paper);
      onClose();
    } catch (err: any) {
      console.error('[MovePaperDialog] Error moving paper:', err);
      toast.error(err.message || 'Could not reassign course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-6 gap-5 bg-card border border-border shadow-xl rounded-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider font-semibold">
            <FolderInput className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Course Reassignment
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Move Past Paper to Course
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Reassign this past question paper if its course code was updated or if it was cataloged under the wrong course.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleMove} className="space-y-4">
          {/* Current Paper Metadata Box */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Selected Paper
            </div>
            <div className="text-sm font-bold text-foreground line-clamp-1">
              {normalizePastPaperTitle(paper.title) || 'Past Examination Paper'}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Current:</span>
              <span className="font-semibold text-foreground px-2 py-0.5 rounded bg-background border border-border/80 font-mono text-[11px]">
                {currentCourseDisplay}
              </span>
            </div>
          </div>

          {/* Optional Title Renaming */}
          <div className="space-y-1.5">
            <Label htmlFor="paper-title" className="text-xs font-semibold text-foreground">
              Paper Title
            </Label>
            <Input
              id="paper-title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. BSIT 309: Information System Security"
              className="text-xs h-9 bg-background"
            />
          </div>

          {/* Destination Course Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Select Destination Course</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {courses.length} courses enrolled
              </span>
            </Label>

            {courses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-1">
                <AlertCircle className="w-4 h-4 mx-auto text-amber-500" />
                <p>No enrolled courses found on your profile.</p>
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                {courses.map((course) => {
                  const isSelected = selectedCourseId === course.id;
                  const colorAccent = resolveCourseColor(course.colour || undefined);

                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setSelectedCourseId(course.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-border/70 hover:border-primary/40 bg-card hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: colorAccent }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                              {course.course_code || 'EXAM'}
                            </span>
                            <span className="text-xs font-semibold text-foreground truncate">
                              {course.title}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedCourseId}
              className="text-xs h-9 bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white font-semibold cursor-pointer gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Moving Paper...
                </>
              ) : (
                <>
                  <FolderInput className="w-3.5 h-3.5" />
                  Move to Course
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
