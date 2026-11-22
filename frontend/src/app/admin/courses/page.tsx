'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Merge,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
  Archive,
  Edit,
  FolderInput,
  Building,
  X,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CourseItem {
  id: string;
  course_code: string;
  normalized_code: string;
  title: string;
  department_id: string | null;
  semester: string | null;
  academic_year: string | null;
  colour: string;
  is_archived: boolean;
  created_at: string;
  lecture_count: number;
  paper_count: number;
  has_duplicate: boolean;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, archived: 0, with_duplicates: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDuplicatesOnly, setFilterDuplicatesOnly] = useState(false);

  // Merge Modal State
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [sourceCourse, setSourceCourse] = useState<CourseItem | null>(null);
  const [targetCourseId, setTargetCourseId] = useState('');
  const [merging, setMerging] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCourses(data.courses || []);
      setStats(data.stats || { total: 0, active: 0, archived: 0, with_duplicates: 0 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceCourse || !targetCourseId) return;

    if (sourceCourse.id === targetCourseId) {
      toast.error('Source and target course must be different');
      return;
    }

    setMerging(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge',
          source_course_id: sourceCourse.id,
          target_course_id: targetCourseId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || 'Course merged successfully!');
      setMergeModalOpen(false);
      setSourceCourse(null);
      setTargetCourseId('');
      fetchCourses();
    } catch (err: any) {
      toast.error(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const displayedCourses = filterDuplicatesOnly
    ? courses.filter((c) => c.has_duplicate)
    : courses;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#00004E] dark:text-[#D89A06]" />
            Master Course Directory &amp; Merge Control
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Reconcile syllabus course codes, detect duplicate student course banks, and merge materials atomically into canonical courses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchCourses}
            variant="outline"
            size="sm"
            disabled={loading}
            className="gap-1.5 cursor-pointer text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Courses</div>
          <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stats.total}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Curriculum</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{stats.active}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Archived / Merged</div>
          <div className="text-2xl font-bold text-muted-foreground mt-1 tabular-nums">{stats.archived}</div>
        </div>
        <div
          onClick={() => setFilterDuplicatesOnly(!filterDuplicatesOnly)}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            filterDuplicatesOnly
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-border bg-card hover:border-amber-500/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            Duplicate Codes
            {stats.with_duplicates > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {stats.with_duplicates}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Click to filter duplicates</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course code (e.g. BCPC201) or syllabus title..."
            className="pl-9 h-10 text-xs"
          />
        </div>
        {filterDuplicatesOnly && (
          <Button
            onClick={() => setFilterDuplicatesOnly(false)}
            variant="secondary"
            size="sm"
            className="text-xs gap-1.5 cursor-pointer"
          >
            Clear Duplicate Filter
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Course List Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                <th className="py-3 px-4">Course Code</th>
                <th className="py-3 px-4">Title &amp; Academic Status</th>
                <th className="py-3 px-4">Lecture Slides</th>
                <th className="py-3 px-4">Past Papers</th>
                <th className="py-3 px-4">Duplicate Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {displayedCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No courses match your query.
                  </td>
                </tr>
              ) : (
                displayedCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.colour || '#00004E' }}
                        />
                        <span className="font-mono font-bold text-foreground text-xs">{c.course_code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.semester ? `${c.semester} · ` : ''}
                        {c.academic_year || 'Current Academic Year'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                        {c.lecture_count}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {c.paper_count}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {c.is_archived ? (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                          Archived
                        </Badge>
                      ) : c.has_duplicate ? (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                          Conflict Detected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                          Canonical
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        onClick={() => {
                          setSourceCourse(c);
                          setMergeModalOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs cursor-pointer border-border hover:border-primary/50"
                      >
                        <Merge className="w-3 h-3 text-[#00004E] dark:text-[#D89A06]" />
                        Merge Course
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MERGE MODAL */}
      {mergeModalOpen && sourceCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Merge className="w-4 h-4 text-[#D89A06]" />
                Merge Course Bank
              </h3>
              <button
                onClick={() => setMergeModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Atomic Course Reassignment
              </div>
              <p>
                All <strong>{sourceCourse.lecture_count} lecture slides</strong> and{' '}
                <strong>{sourceCourse.paper_count} past papers</strong> currently attached to{' '}
                <strong className="underline">{sourceCourse.course_code}</strong> will be moved into your selected target
                course. Source will be archived.
              </p>
            </div>

            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Source Course (To be merged and archived)
                </label>
                <div className="p-2.5 rounded-lg border border-border bg-muted/40 font-mono text-xs font-bold text-foreground">
                  {sourceCourse.course_code} — {sourceCourse.title}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Target Canonical Course (Receives all materials)
                </label>
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Select target course...</option>
                  {courses
                    .filter((c) => c.id !== sourceCourse.id && !c.is_archived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} — {c.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMergeModalOpen(false)}
                  disabled={merging}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={merging || !targetCourseId}
                  className="bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-semibold gap-1.5 cursor-pointer"
                >
                  {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Merge className="w-3.5 h-3.5" />}
                  Confirm Course Merge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
