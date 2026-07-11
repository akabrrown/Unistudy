'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, UploadCloud, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CoursesPage() {
  const [courses, setCourses] = useState([
    { id: 1, code: 'BIOL3012', name: 'Molecular Biology', lectures: 18, color: '#5B2D8E' },
    { id: 2, code: 'CHEM2040', name: 'Organic Chemistry', lectures: 14, color: '#7B4DB5' },
    { id: 3, code: 'MATH2050', name: 'Applied Mathematics', lectures: 22, color: '#9B72CF' },
  ])

  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">{courses.length} active modules</p>
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
                  <Input id="code" placeholder="e.g. CS101" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Course Name</Label>
                  <Input id="name" placeholder="e.g. Intro to CS" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setIsCourseDialogOpen(false)}>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <Link key={course.id} href={`/dashboard/courses/${course.id}/lectures/1`}>
            <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: course.color }} />
              <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">{course.code}</p>
                  <CardTitle className="text-xl">{course.name}</CardTitle>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <BookOpen size={18} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-4 border-t pt-4">
                <div className="text-sm text-muted-foreground">{course.lectures} lectures</div>
                
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

                  <Dialog open={isUploadDialogOpen && activeCourseId === course.id} onOpenChange={(open) => {
                    setIsUploadDialogOpen(open)
                    if(open) setActiveCourseId(course.id)
                    else setActiveCourseId(null)
                  }}>
                    <DialogTrigger 
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted hover:text-foreground h-8 px-3 gap-1.5 text-xs font-medium transition-colors" 
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                      <UploadCloud size={14} /> Upload
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Upload Lecture to {course.code}</DialogTitle>
                      <DialogDescription>
                        Upload a PDF of your lecture slides. We will extract the content and prepare it for AI processing.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-6">
                      <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                          <UploadCloud size={24} />
                        </div>
                        <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PDF files up to 50MB</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" disabled>Process Lecture</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
