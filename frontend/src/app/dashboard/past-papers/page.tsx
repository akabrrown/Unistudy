'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  BookOpen,
  Clock,
  Users,
  ArrowRight,
  Bot,
  Trash2,
  Search,
  FolderOpen,
  Upload,
  CheckCircle2,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import Link from 'next/link'
import { resolveCourseColor } from '@/lib/constants/courses'
import { UploadModal } from '@/components/past-papers/UploadModal'
import { cn } from '@/lib/utils'

interface CourseItem {
  id: string
  course_code: string
  title: string
  semester?: number | string
  year?: number
  colour?: string
  past_papers?: any[]
}

export default function PastPapersDashboard() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [papers, setPapers] = useState<any[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [preselectedCourseId, setPreselectedCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPapers, setSelectedPapers] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string | null>(null)
  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 1. Fetch user's courses with past papers count
      const coursesData = await apiFetch('/courses').catch(() => [])
      if (Array.isArray(coursesData)) {
        setCourses(coursesData)
      }

      // 2. Fetch past papers
      const { data: papersData } = await supabase
        .from('past_papers')
        .select('*, courses(id, course_code, title, colour)')
        .order('created_at', { ascending: false })

      if (papersData) {
        setPapers(papersData)
      }
    } catch (err) {
      console.error('Error loading past papers dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenUpload = (courseId?: string) => {
    setPreselectedCourseId(courseId || null)
    setIsUploadModalOpen(true)
  }

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedPapers(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]))
  }

  const handleDelete = async (e: React.MouseEvent | null, ids: string[]) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!confirm(`Are you sure you want to delete ${ids.length} paper(s)?`)) return
    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const id of ids) {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/past-papers/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
      }
      setSelectedPapers([])
      loadData()
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter papers by search query and optional course filter
  const filteredPapers = papers.filter(p => {
    if (selectedCourseFilter && p.course_id !== selectedCourseFilter) {
      return false
    }
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const code = p.courses?.course_code?.toLowerCase() || ''
    const title = p.courses?.title?.toLowerCase() || ''
    const paperTitle = p.title?.toLowerCase() || ''
    return code.includes(q) || title.includes(q) || paperTitle.includes(q)
  })

  // Filter courses by search query
  const filteredCourses = courses.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.course_code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-primary" />
            Past Question Banks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Your course question banks are automatically linked with your enrolled courses.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/courses">
            <Button variant="outline" size="sm" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Manage Courses
            </Button>
          </Link>
          <Button onClick={() => handleOpenUpload()} className="gap-2 shadow-xs">
            <Plus className="w-4 h-4" />
            Upload Past Paper
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Course Banks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{courses.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Enrolled courses with question banks</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Exam Papers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{papers.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Total past papers uploaded</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" /> AI Practice Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {papers.filter(p => p.status === 'ready').length}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Papers indexed with OCR extraction</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search course banks or past papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-background"
          />
        </div>

        {selectedCourseFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCourseFilter(null)}
            className="text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
          >
            Clear course filter ({courses.find(c => c.id === selectedCourseFilter)?.course_code})
          </Button>
        )}
      </div>

      {/* SECTION 1: Course Question Banks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Course Question Banks
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any of your courses to view questions or upload new exam papers directly.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="border-dashed bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold text-foreground">No course banks yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1 mb-4">
                When you create courses in your dashboard, they automatically appear here as question banks.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/dashboard/courses">
                  <Button size="sm">Create First Course</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => handleOpenUpload()}>
                  Upload Past Paper
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map(course => {
              const coursePapers = papers.filter(p => p.course_id === course.id)
              const paperCount = coursePapers.length || course.past_papers?.length || 0
              const isFiltered = selectedCourseFilter === course.id

              return (
                <Card
                  key={course.id}
                  className={cn(
                    "relative overflow-hidden transition-all duration-200 hover:shadow-sm border",
                    isFiltered
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border hover:border-primary/40 bg-card"
                  )}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: resolveCourseColor(course.colour) }}
                  />

                  <CardHeader className="pt-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-muted text-foreground mb-1.5">
                          {course.course_code}
                        </span>
                        <CardTitle className="text-base font-semibold line-clamp-1">
                          {course.title}
                        </CardTitle>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-secondary text-secondary-foreground shrink-0">
                        {paperCount} {paperCount === 1 ? 'paper' : 'papers'}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>Sem {course.semester || 1} • {course.year || new Date().getFullYear()}</span>
                      {paperCount > 0 ? (
                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready for practice
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No papers yet</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <Button
                        size="sm"
                        variant={isFiltered ? "default" : "outline"}
                        className="flex-1 text-xs h-8"
                        onClick={() => setSelectedCourseFilter(isFiltered ? null : course.id)}
                      >
                        {isFiltered ? 'Showing Papers' : 'Filter Papers'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs h-8 gap-1.5"
                        onClick={() => handleOpenUpload(course.id)}
                        title="Upload past paper for this course"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </Button>
                      <Link href={`/dashboard/courses/${course.id}/past-papers`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Open course past papers & drills page">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Available Exam Papers */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              {selectedCourseFilter ? (
                <>Papers for {courses.find(c => c.id === selectedCourseFilter)?.course_code || 'Selected Course'}</>
              ) : (
                <>All Uploaded Past Papers</>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any past paper to view extracted questions, start practice drills, or receive AI feedback.
            </p>
          </div>

          {selectedPapers.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => handleDelete(null, selectedPapers)}
              disabled={isDeleting}
              className="shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete ({selectedPapers.length})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/40 rounded-xl" />
            ))}
          </div>
        ) : filteredPapers.length === 0 ? (
          <Card className="border-dashed bg-card/40">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold text-foreground">No past papers found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                {selectedCourseFilter
                  ? "No papers uploaded for this course bank yet."
                  : "Upload an examination PDF to let AI extract questions for practice."}
              </p>
              <Button onClick={() => handleOpenUpload(selectedCourseFilter || undefined)} variant="outline" size="sm">
                Upload Paper Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPapers.map(paper => {
              const examLabel =
                paper.exam_type === 'mid-semester'
                  ? 'Midterm Exam'
                  : paper.exam_type === 'resit'
                  ? 'Resit Exam'
                  : 'Final Exam'

              return (
                <Link key={paper.id} href={`/dashboard/past-papers/${paper.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group bg-card">
                    <CardHeader className="relative pb-2">
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleDelete(e, [paper.id])}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          disabled={isDeleting}
                          title="Delete paper"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div
                          onClick={(e) => toggleSelect(e, paper.id)}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          title="Select paper"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPapers.includes(paper.id)}
                            readOnly
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="pr-16">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary">
                            {paper.courses?.course_code || 'EXAM'}
                          </span>
                          <span className="text-xs text-muted-foreground">{examLabel}</span>
                        </div>
                        <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-1">
                          {paper.courses?.title || paper.title} - {paper.year}
                        </CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {new Date(paper.created_at).toLocaleDateString()}
                        </span>
                        {paper.status === 'processing' ? (
                          <span className="text-yellow-500 font-medium">Processing OCR...</span>
                        ) : (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Practice
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          setPreselectedCourseId(null)
        }}
        onSuccess={() => {
          setIsUploadModalOpen(false)
          setPreselectedCourseId(null)
          loadData()
        }}
        preselectedCourseId={preselectedCourseId}
      />
    </div>
  )
}
