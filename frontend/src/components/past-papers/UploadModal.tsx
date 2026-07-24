'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, UploadCloud, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import axios from 'axios'

interface FileUploadData {
  id: string
  file: File
  courseCode: string
  courseName: string
  year: string
  examType: string
  progress: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

export function UploadModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [filesData, setFilesData] = useState<FileUploadData[]>([])
  const supabase = createClient()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files).map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      courseCode: '',
      courseName: '',
      year: new Date().getFullYear().toString(),
      examType: 'Final',
      progress: 0,
      status: 'idle' as const
    }))
    setFilesData(prev => [...prev, ...newFiles])
    // reset input
    e.target.value = ''
  }

  const removeFile = (id: string) => {
    setFilesData(prev => prev.filter(f => f.id !== id))
  }

  const updateFileData = (id: string, updates: Partial<FileUploadData>) => {
    setFilesData(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleUploadAll = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    let anySuccess = false

    // Process sequentially to not overload backend AI extraction and avoid ratelimits
    for (const fData of filesData) {
      if (fData.status === 'success' || fData.status === 'uploading') continue
      
      if (!fData.courseCode || !fData.courseName || !fData.year || !fData.examType) {
        updateFileData(fData.id, { status: 'error', error: 'Missing fields' })
        continue
      }

      updateFileData(fData.id, { status: 'uploading', progress: 0, error: undefined })

      try {
        const formData = new FormData()
        formData.append('file', fData.file)
        formData.append('courseCode', fData.courseCode)
        formData.append('courseName', fData.courseName)
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
          error: err.response?.data?.error || err.message || 'Upload failed' 
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
          <DialogTitle>Upload Past Papers</DialogTitle>
          <DialogDescription>
            Upload one or more PDFs. Provide details for each to extract questions automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
          {filesData.map((fData, index) => (
            <div key={fData.id} className="p-4 border rounded-lg bg-card shadow-sm space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm line-clamp-1 flex-1 pr-4">{index + 1}. {fData.file.name}</span>
                {fData.status === 'idle' && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFile(fData.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                {fData.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {fData.status === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
                {fData.status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs">Course Code</Label>
                  <Input 
                    value={fData.courseCode} 
                    onChange={(e) => updateFileData(fData.id, { courseCode: e.target.value.toUpperCase() })} 
                    placeholder="CS101" 
                    disabled={fData.status === 'success' || fData.status === 'uploading'}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Course Name</Label>
                  <Input 
                    value={fData.courseName} 
                    onChange={(e) => updateFileData(fData.id, { courseName: e.target.value })} 
                    placeholder="Intro to CS" 
                    disabled={fData.status === 'success' || fData.status === 'uploading'}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs">Year</Label>
                  <Input 
                    type="number" 
                    value={fData.year} 
                    onChange={(e) => updateFileData(fData.id, { year: e.target.value })} 
                    disabled={fData.status === 'success' || fData.status === 'uploading'}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Exam Type</Label>
                  <Input 
                    value={fData.examType} 
                    onChange={(e) => updateFileData(fData.id, { examType: e.target.value })} 
                    placeholder="Midterm, Final..." 
                    disabled={fData.status === 'success' || fData.status === 'uploading'}
                  />
                </div>
              </div>

              {fData.error && <p className="text-xs text-destructive">{fData.error}</p>}
              
              {fData.status === 'uploading' && (
                <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className="bg-primary h-1.5 transition-all duration-300 ease-out" 
                    style={{ width: `${fData.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="grid gap-2">
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 relative group hover:bg-muted/30 transition-colors cursor-pointer">
              <UploadCloud className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground font-medium">
                Click or drag to add PDFs
              </span>
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
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
          {allSuccess ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancel</Button>
              <Button onClick={handleUploadAll} disabled={isUploading || filesData.length === 0}>
                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Upload All'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
