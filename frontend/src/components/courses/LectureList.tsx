'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowRight, Trash2, CheckSquare, Square } from 'lucide-react';
import { DeleteLectureButton } from '@/components/courses/DeleteLectureButton';
import { Button } from '@/components/ui/button';
import { bulkDeleteLectures } from '@/app/actions/lectures';

export function LectureList({ courseId, lectures }: { courseId: string, lectures: any[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === lectures.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(lectures.map(l => l.id)));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} lectures?`)) return;
    
    setIsDeleting(true);
    const result = await bulkDeleteLectures(Array.from(selectedIds), courseId);
    setIsDeleting(false);
    
    if (result.success) {
      setSelectedIds(new Set());
    } else {
      alert(result.error || 'Failed to delete selected lectures');
    }
  };

  if (!lectures || lectures.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
        <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">No lectures uploaded yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Upload a PDF to generate AI slides.</p>
      </div>
    );
  }

  // Separate past questions from slides
  const isPastQuestion = (title: string) => {
    const t = title?.toLowerCase() || '';
    return t.includes('past question') || t.includes('past paper') || t.includes('exam') || t.includes('quiz') || t.includes('test');
  };

  const slides = lectures.filter(l => !isPastQuestion(l.title));
  const pastQuestions = lectures.filter(l => isPastQuestion(l.title));

  // Group slides by week
  const groupedSlides = slides.reduce((acc: any, lec: any) => {
    const week = lec.week || 'Unassigned';
    if (!acc[week]) acc[week] = [];
    acc[week].push(lec);
    return acc;
  }, {});

  // Sort weeks: numeric weeks first, then 'Unassigned'
  const sortedWeeks = Object.keys(groupedSlides).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return parseInt(a) - parseInt(b);
  });

  return (
    <div className="space-y-6">
      {lectures.length > 0 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
            {selectedIds.size === lectures.length ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
            {selectedIds.size === lectures.length ? 'Deselect All' : 'Select All'}
          </Button>
          
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </Button>
          )}
        </div>
      )}
      
      {sortedWeeks.map(week => (
        <div key={week} className="space-y-3 border border-border bg-muted/10 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              {week === 'Unassigned' ? 'Unassigned Lectures' : `Week ${week}`}
            </span>
            <span className="text-xs text-muted-foreground font-medium">({groupedSlides[week].length} Lectures)</span>
          </div>
          
          <div className="grid gap-3">
            {groupedSlides[week].map((lec: any) => {
              const isSelected = selectedIds.has(lec.id);
              return (
                <div 
                  key={lec.id}
                  className={`flex items-center justify-between p-2 pr-4 rounded-xl border transition-all group relative ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'}`}
                >
                  <div className="flex items-center gap-3 z-10 pl-2">
                    <button onClick={() => toggleSelect(lec.id)} className="text-muted-foreground hover:text-primary transition-colors focus:outline-none">
                      {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                    </button>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary pointer-events-none flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <Link 
                      href={`/dashboard/courses/${courseId}/lectures/${lec.id}`}
                      className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate max-w-[200px] md:max-w-[400px]"
                      title={lec.title || "Untitled Lecture"}
                    >
                      {lec.title || "Untitled Lecture"}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 z-10 relative">
                    <DeleteLectureButton 
                      lectureId={lec.id} 
                      courseId={courseId} 
                      lectureTitle={lec.title || "Untitled Lecture"} 
                    />
                    <Link href={`/dashboard/courses/${courseId}/lectures/${lec.id}`}>
                      <ArrowRight size={18} className="text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {pastQuestions.length > 0 && (
        <div className="space-y-3 border border-border bg-amber-500/5 dark:bg-amber-500/10 rounded-xl p-4 shadow-sm mt-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              Past Questions & Exams
            </span>
            <span className="text-xs text-muted-foreground font-medium">({pastQuestions.length} Documents)</span>
          </div>
          
          <div className="grid gap-3">
            {pastQuestions.map((lec: any) => {
              const isSelected = selectedIds.has(lec.id);
              return (
                <div 
                  key={lec.id}
                  className={`flex items-center justify-between p-2 pr-4 rounded-xl border transition-all group relative ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-card hover:border-amber-500/50 hover:bg-muted/30'}`}
                >
                  <div className="flex items-center gap-3 z-10 pl-2">
                    <button onClick={() => toggleSelect(lec.id)} className="text-muted-foreground hover:text-amber-600 transition-colors focus:outline-none">
                      {isSelected ? <CheckSquare className="h-5 w-5 text-amber-600" /> : <Square className="h-5 w-5" />}
                    </button>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 pointer-events-none flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <Link 
                      href={`/dashboard/courses/${courseId}/lectures/${lec.id}`}
                      className="font-medium text-sm text-foreground hover:text-amber-600 transition-colors truncate max-w-[200px] md:max-w-[400px]"
                      title={lec.title || "Untitled Document"}
                    >
                      {lec.title || "Untitled Document"}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 z-10 relative">
                    <DeleteLectureButton 
                      lectureId={lec.id} 
                      courseId={courseId} 
                      lectureTitle={lec.title || "Untitled Document"} 
                    />
                    <Link href={`/dashboard/courses/${courseId}/lectures/${lec.id}`}>
                      <ArrowRight size={18} className="text-muted-foreground hover:text-amber-600 transition-colors" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
