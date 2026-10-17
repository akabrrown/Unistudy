'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import { Loader2, UploadCloud, Trash2, CheckCircle2, XCircle, BookOpen, PlusCircle } from 'lucide-react'
import axios from 'axios'

interface CourseOption {
  id: string
  course_code: string
  title: string
  colour?: string
}

interface FileUploadData {
  id: string
  file: File
  courseId: string // course UUID or 'new'
  courseCode: string
  courseName: string
  year: string
  examType: 'end-semester' | 'mid-semester' | 'resit'
  progress: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedCourseId?: string | null
}

export function UploadModal({ isOpen, onClose, onSuccess, preselectedCourseId }: UploadModalProps) {
  const [filesData, setFilesData] = useState<FileUploadData[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const supabase = createClient()

  // Fetch courses when modal is opened
  useEffect(() => {
    if (isOpen) {
      loadCourses()
    }
  }, [isOpen])

  const loadCourses = async () => {
    setLoadingCourses(true)
    try {
      const data = await apiFetch('/courses')
      if (Array.isArray(data)) {
        setCourses(data)
      }
    } catch (e) {
      console.error('Failed to load courses for upload modal', e)
    } finally {
      setLoadingCourses(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    // Find default course if preselected or first existing
    const defaultCourse = preselectedCourseId 
      ? courses.find(c => c.id === preselectedCourseId) 
      : (courses.length > 0 ? courses[0] : null)

    const newFiles: FileUploadData[] = Array.from(e.target.files).map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      courseId: defaultCourse ? defaultCourse.id : (courses.length > 0 ? courses[0].id : 'new'),
      courseCode: defaultCourse ? defaultCourse.course_code : '',
      courseName: defaultCourse ? defaultCourse.title : '',
      year: new Date().getFullYear().toString(),
      examType: 'end-semester',
      progress: 0,
      status: 'idle' as const
    }))

    setFilesData(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  const removeFile = (id: string) => {
    setFilesData(prev => prev.filter(f => f.id !== id))
  }

  const updateFileData = (id: string, updates: Partial<FileUploadData>) => {
    setFilesData(prev => prev.map(f => {
      if (f.id !== id) return f
      const updated = { ...f, ...updates }

      // If courseId changed to an existing course, sync code & title
      if (updates.courseId && updates.courseId !== 'new') {
        const found = courses.find(c => c.id === updates.courseId)
        if (found) {
          updated.courseCode = found.course_code
          updated.courseName = found.title
        }
      }

      return updated
    }))
  }

  const handleUploadAll = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    let anySuccess = false

    for (const fData of filesData) {
      if (fData.status === 'success' || fData.status === 'uploading') continue
      
      if (!fData.courseCode.trim() || !fData.courseName.trim()) {
        updateFileData(fData.id, { status: 'error', error: 'Please select or enter course code and name' })
        continue
      }

      updateFileData(fData.id, { status: 'uploading', progress: 0, error: undefined })

      try {
        const formData = new FormData()
        formData.append('file', fData.file)
        if (fData.courseId && fData.courseId !== 'new') {
          formData.append('courseId', fData.courseId)
        }
        formData.append('courseCode', fData.courseCode.trim().toUpperCase())
        formData.append('courseName', fData.courseName.trim())
        formData.append('year', fData.year)
        formData.append('examType', fData.examType)

        await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/past-papers/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              updateFileData(fData.id, { progress: percentCompleted })
            }
          }
        })

        updateFileData(fData.id, { status: 'success', progress: 100 })
        anySuccess = true
      } catch (err: any) {
        updateFileData(fData.id, { 
          status: 'error', 
          error: err.response?.data?.details || err.response?.data?.error || err.message || 'Upload failed' 
        })
      }
    }

    if (anySuccess) {
      onSuccess()
    }
  }

  const isUploading = filesData.some(f => f.status === 'uploading')
  const allSuccess = filesData.length > 0 && filesData.every(f => f.status === 'success')

  const handleClose = () => {
    setFilesData([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Upload to Past Question Bank
          </DialogTitle>
          <DialogDescription>
            Attach past exam papers to your course question banks. Questions will be automatically extracted and indexed for AI practice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
          {filesData.map((fData, index) => {
            const isCustomCourse = fData.courseId === 'new' || courses.length === 0;

            return (
              <div key={fData.id} className="p-4 border border-border rounded-xl bg-card shadow-xs space-y-4 relative">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm line-clamp-1 flex-1 pr-4">
                    {index + 1}. {fData.file.name}
                  </span>
                  {fData.status === 'idle' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(fData.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {fData.status === 'success' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
                      <CheckCircle2 className="w-4 h-4" /> Ready
                    </span>
                  )}
                  {fData.status === 'error' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <XCircle className="w-4 h-4" /> Failed
                    </span>
                  )}
                  {fData.status === 'uploading' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing OCR...
                    </span>
                  )}
                </div>

                {/* Course Selection */}
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Course Question Bank</Label>
                    <Select
                      value={fData.courseId}
                      onValueChange={(val) => updateFileData(fData.id, { courseId: val || 'new' })}
                      disabled={fData.status === 'success' || fData.status === 'uploading'}
                    >
                      <SelectTrigger className="w-full h-9 bg-background">
                        <SelectValue placeholder="Select course bank..." />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            <span className="font-medium">{course.course_code}</span> – {course.title}
                          </SelectItem>
                        ))}
                        <SelectItem value="new" className="text-primary font-medium">
                          <span className="flex items-center gap-1.5">
                            <PlusCircle className="w-3.5 h-3.5" /> + Create New Course Bank
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Manual entry if 'new' course is selected */}
                  {isCustomCourse && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border/60">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Course Code</Label>
                        <Input
                          value={fData.courseCode}
                          onChange={(e) => updateFileData(fData.id, { courseCode: e.target.value.toUpperCase() })}
                          placeholder="e.g. CS101"
                          disabled={fData.status === 'success' || fData.status === 'uploading'}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Course Name / Title</Label>
                        <Input
                          value={fData.courseName}
                          onChange={(e) => updateFileData(fData.id, { courseName: e.target.value })}
                          placeholder="e.g. Intro to Computer Science"
                          disabled={fData.status === 'success' || fData.status === 'uploading'}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground sm:col-span-2">
                        This course will automatically be added to your Courses list and Question Bank.
                      </p>
                    </div>
                  )}

                  {/* Exam details: Year and Exam Type */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Exam Year</Label>
                      <Input
                        type="number"
                        min="2000"
                        max="2100"
                        value={fData.year}
                        onChange={(e) => updateFileData(fData.id, { year: e.target.value })}
                        disabled={fData.status === 'success' || fData.status === 'uploading'}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Exam Type</Label>
                      <Select
                        value={fData.examType}
                        onValueChange={(val: any) => updateFileData(fData.id, { examType: val })}
                        disabled={fData.status === 'success' || fData.status === 'uploading'}
                      >
                        <SelectTrigger className="w-full h-9 bg-background">
                          <SelectValue placeholder="Exam Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="end-semester">Final (End-Semester)</SelectItem>
                          <SelectItem value="mid-semester">Mid-Semester</SelectItem>
                          <SelectItem value="resit">Resit Exam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {fData.error && <p className="text-xs text-destructive font-medium">{fData.error}</p>}

                {fData.status === 'uploading' && (
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-primary h-1.5 transition-all duration-300 ease-out"
                      style={{ width: `${fData.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {/* Add file dropzone */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-muted/10 relative group hover:bg-muted/30 transition-colors cursor-pointer">
            <UploadCloud className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
            <span className="text-sm text-foreground font-medium">Click or drag to add past exam PDFs</span>
            <span className="text-xs text-muted-foreground mt-0.5">Supports single or multi-page examination PDFs</span>
            <input
              type="file"
              multiple
              accept="application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-auto">
          {allSuccess ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUploadAll} disabled={isUploading || filesData.length === 0}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing OCR...
                  </>
                ) : (
                  'Upload to Question Bank'
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
