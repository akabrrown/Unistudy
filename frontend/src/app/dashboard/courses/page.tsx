'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, UploadCloud, BookOpen, Trash2, Loader2, FileText, Edit3, Archive, ArchiveRestore, Check } from 'lucide-react'
import { COURSE_COLORS, resolveCourseColor } from '@/lib/constants/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'
import { UploadLectureDialog } from '@/components/courses/UploadLectureDialog'

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)

  
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('#5B2D8E');
  const [newCourseSemester, setNewCourseSemester] = useState('1');
  const [newCourseYear, setNewCourseYear] = useState(new Date().getFullYear().toString());

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseColor, setEditCourseColor] = useState('#5B2D8E');
  const [editCourseSemester, setEditCourseSemester] = useState('1');
  const [editCourseYear, setEditCourseYear] = useState('');

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const data = await apiFetch('/courses')
      setCourses(data || []);
      console.log('Fetched courses:', data || []);
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteCourse = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if(confirm('Are you sure you want to delete this course?')) {
      const previousCourses = [...courses]
      setCourses(courses.filter(c => c.id !== id))
      
      try {
        await apiFetch(`/courses/${id}`, { method: 'DELETE' })
        toast.success('Course deleted')
      } catch (err: any) {
        setCourses(previousCourses)
        toast.error(err.message)
      }
    }
  }

  const handleAddCourse = async () => {
    if (!newCourseCode || !newCourseName) {
      toast.error("Please provide both a course code and a name.")
      return
    }
    
    try {
      const colour = newCourseColor || '#5B2D8E';
      const newCourseData = {
        course_code: newCourseCode.toUpperCase(),
        title: newCourseName,
        colour,
        semester: parseInt(newCourseSemester) || 1,
        year: parseInt(newCourseYear) || new Date().getFullYear()
      }

      const fetchedCourse = await apiFetch('/courses', {
        method: 'POST',
        body: JSON.stringify(newCourseData)
      });
      
      setCourses(prev => [fetchedCourse, ...prev]);

      setNewCourseCode('');
      setNewCourseName('');
      setIsCourseDialogOpen(false);
      toast.success('Course added');
    } catch (err: any) {
      console.error('Unexpected error adding course:', err);
      toast.error(err.message || 'Unexpected error');
    }
  }

  const openEditDialog = (e: React.MouseEvent, course: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditCourseId(course.id);
    setEditCourseCode(course.course_code || '');
    setEditCourseName(course.title || '');
    setEditCourseColor(resolveCourseColor(course.colour));
    setEditCourseSemester(course.semester?.toString() || '1');
    setEditCourseYear(course.year?.toString() || new Date().getFullYear().toString());
    setIsEditDialogOpen(true);
  }

  const handleUpdateCourse = async () => {
    if (!editCourseId) return;
    try {
      const updatedCourse = await apiFetch(`/courses/${editCourseId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          course_code: editCourseCode.toUpperCase(),
          title: editCourseName,
          colour: editCourseColor,
          semester: parseInt(editCourseSemester) || 1,
          year: parseInt(editCourseYear) || new Date().getFullYear()
        })
      });
      setCourses(courses.map(c => c.id === editCourseId ? updatedCourse : c));
      setIsEditDialogOpen(false);
      toast.success('Course updated');
    } catch (err: any) {
      toast.error(err.message || 'Error updating course');
    }
  }

  const handleArchiveCourse = async (e: React.MouseEvent, id: string, isArchived: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const updatedCourse = await apiFetch(`/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_archived: !isArchived })
      });
      setCourses(courses.map(c => c.id === id ? updatedCourse : c));
      toast.success(isArchived ? 'Course restored' : 'Course archived');
    } catch (err: any) {
      toast.error(err.message || 'Error archiving course');
    }
  }

  const activeCourses = courses.filter(c => !c.is_archived && c.colour !== '#hidden');
  const archivedCourses = courses.filter(c => c.is_archived && c.colour !== '#hidden');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">{activeCourses.length} active modules</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 py-2 gap-2 text-sm font-medium transition-colors">
              <Plus size={16} /> Add Course
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create new course</DialogTitle>
                <DialogDescription>
                  Add a new university module to organize your lectures and flashcards.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">Course Code</Label>
                  <Input id="code" placeholder="e.g. CS101" className="col-span-3" value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Course Name</Label>
                  <Input id="name" placeholder="e.g. Intro to CS" className="col-span-3" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Course Colour</Label>
                  <div className="col-span-3 flex flex-wrap gap-2 pt-1">
                    {COURSE_COLORS.map((c) => {
                      const isSelected = c.hex.toLowerCase() === newCourseColor.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm"
                              : "hover:scale-105 opacity-85 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          onClick={() => setNewCourseColor(c.hex)}
                          title={c.name}
                          aria-label={`Select ${c.name}`}
                        >
                          {isSelected && (
                            <Check size={14} className="text-white drop-shadow-sm" strokeWidth={3} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleAddCourse}>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2">
          {/* Edit Course Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit course</DialogTitle>
                <DialogDescription>
                  Update the details for this module.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-code" className="text-right">Course Code</Label>
                  <Input id="edit-code" placeholder="e.g. CS101" className="col-span-3" value={editCourseCode} onChange={e => setEditCourseCode(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">Course Name</Label>
                  <Input id="edit-name" placeholder="e.g. Intro to CS" className="col-span-3" value={editCourseName} onChange={e => setEditCourseName(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Course Colour</Label>
                  <div className="col-span-3 flex flex-wrap gap-2 pt-1">
                    {COURSE_COLORS.map((c) => {
                      const isSelected = c.hex.toLowerCase() === editCourseColor.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm"
                              : "hover:scale-105 opacity-85 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          onClick={() => setEditCourseColor(c.hex)}
                          title={c.name}
                          aria-label={`Select ${c.name}`}
                        >
                          {isSelected && (
                            <Check size={14} className="text-white drop-shadow-sm" strokeWidth={3} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleUpdateCourse}>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeCourses.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No active courses</h3>
            <p className="text-muted-foreground max-w-sm mt-2">Get started by adding your first course to begin organizing your study materials.</p>
          </div>
        ) : activeCourses.map(course => (
          <Card
            key={course.id}
            className="relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => {
              router.push(`/dashboard/courses/${course.id}`)
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: resolveCourseColor(course.colour) }} />
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">{course.course_code || 'COURSE'}</p>
                  <CardTitle className="text-xl">{course.title || 'Untitled'}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <BookOpen size={18} />
                  </div>
                  <button 
                    onClick={(e) => openEditDialog(e, course)}
                    className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center text-secondary-foreground hover:bg-secondary transition-colors z-10"
                    title="Edit Course"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={(e) => handleArchiveCourse(e, course.id, !!course.is_archived)}
                    className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors z-10"
                    title="Archive Course"
                  >
                    <Archive size={18} />
                  </button>
                  <button 
                    onClick={(e) => deleteCourse(e, course.id)}
                    className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
                    title="Delete Course"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-4 border-t pt-4">
                <div className="text-sm text-muted-foreground">{course.lectures?.filter((l: any) => !l.title?.startsWith('[FAILED')).length || 0} lectures</div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs px-2 gap-1"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/dashboard/courses/${course.id}/flashcards` }}
                  >
                    <BookOpen size={14} /> Cards
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs px-2 gap-1"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/dashboard/courses/${course.id}/quiz` }}
                  >
                    <BookOpen size={14} /> Quiz
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs px-2 gap-1"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setActiveCourseId(course.id); 
                      setIsUploadDialogOpen(true); 
                    }}
                  >
                    <UploadCloud size={14} /> Upload
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {archivedCourses.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
            <Archive className="w-6 h-6" /> Archived Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 grayscale-[50%]">
            {archivedCourses.map(course => (
              <Card
                key={course.id}
                className="relative overflow-hidden group hover:border-primary/50 transition-colors"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: resolveCourseColor(course.colour) }} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">{course.course_code || 'COURSE'}</p>
                      <CardTitle className="text-xl">{course.title || 'Untitled'}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => handleArchiveCourse(e, course.id, !!course.is_archived)}
                        className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors z-10"
                        title="Restore Course"
                      >
                        <ArchiveRestore size={18} />
                      </button>
                      <button 
                        onClick={(e) => deleteCourse(e, course.id)}
                        className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
                        title="Delete Course"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mt-4 border-t pt-4">
                    <div className="text-sm text-muted-foreground">{course.lectures?.filter((l: any) => !l.title?.startsWith('[FAILED')).length || 0} lectures</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Lecture Dialog */}
      {activeCourseId && (
        <UploadLectureDialog
          courseId={activeCourseId}
          courseCode={courses.find(c => c.id === activeCourseId)?.course_code || 'COURSE'}
          open={isUploadDialogOpen}
          onOpenChange={(open) => {
            setIsUploadDialogOpen(open);
            if (!open) setActiveCourseId(null);
          }}
          onSuccess={fetchCourses}
        />
      )}
    </div>
  )
}
