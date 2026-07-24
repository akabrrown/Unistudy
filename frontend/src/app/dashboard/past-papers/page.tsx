'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, Clock, Users, ArrowRight, Bot, Trash2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { UploadModal } from '@/components/past-papers/UploadModal'

export default function PastPapersDashboard() {
  const [papers, setPapers] = useState<any[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedPapers, setSelectedPapers] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const fetchPapers = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Fetch user's papers and community papers
    const { data, error } = await supabase
      .from('past_papers')
      .select('*, courses(course_code, title)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPapers(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPapers()
  }, [])

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPapers(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const handleDelete = async (e: React.MouseEvent | null, ids: string[]) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!confirm(`Are you sure you want to delete ${ids.length} paper(s)?`)) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return;
      
      for (const id of ids) {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/past-papers/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      }
      setSelectedPapers([])
      fetchPapers()
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Past Papers Bank</h1>
          <p className="text-muted-foreground mt-1">Master your exams with AI-graded practice and trend analysis.</p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Upload Past Paper
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> My Papers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{papers.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-500" /> AI Graded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" /> Community Bank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Live</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recent Papers</h2>
          
          <div className="flex items-center gap-4 flex-1 sm:justify-end">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by course code or name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedPapers.length > 0 && (
              <Button variant="destructive" size="sm" onClick={(e) => handleDelete(null, selectedPapers)} disabled={isDeleting} className="shrink-0">
                <Trash2 className="w-4 h-4 mr-2" /> Delete ({selectedPapers.length})
              </Button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted/50 rounded-xl"></div>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <Card className="border-dashed bg-transparent border-2 border-muted-foreground/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No past papers yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Upload your first past paper to let the AI extract the questions and start practicing.
              </p>
              <Button onClick={() => setIsUploadModalOpen(true)} variant="outline">
                Upload Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {papers.filter(p => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              const code = p.courses?.course_code?.toLowerCase() || '';
              const title = p.courses?.title?.toLowerCase() || '';
              return code.includes(q) || title.includes(q);
            }).map((paper) => (
              <Link key={paper.id} href={`/dashboard/past-papers/${paper.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardHeader className="relative">
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDelete(e, [paper.id])}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div onClick={(e) => toggleSelect(e, paper.id)} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedPapers.includes(paper.id)}
                          readOnly
                          className="w-4 h-4 accent-primary cursor-pointer" 
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-start pt-2">
                      <div className="pr-16">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {paper.courses?.title || 'Unknown Course'} - {paper.year}
                        </CardTitle>
                        <CardDescription>{paper.courses?.course_code && `${paper.courses.course_code} • `}{paper.exam_type} Exam</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(paper.created_at).toLocaleDateString()}</span>
                      {paper.status === 'processing' ? (
                        <span className="flex items-center gap-1 text-yellow-500 font-medium">Processing OCR...</span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-500 font-medium">Ready</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSuccess={fetchPapers}
      />
    </div>
  )
}
