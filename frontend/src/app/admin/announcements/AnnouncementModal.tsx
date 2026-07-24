'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'

export interface Announcement {
  id: string
  title: string
  body: string
  type: string
  target_audience: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  announcement?: Announcement | null
}

export function AnnouncementModal({ open, onOpenChange, onSuccess, announcement }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('banner')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (announcement) {
        setTitle(announcement.title)
        setBody(announcement.body)
        setType(announcement.type || 'banner')
      } else {
        setTitle('')
        setBody('')
        setType('banner')
      }
    }
  }, [open, announcement])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }

    setLoading(true)
    try {
      const url = announcement 
        ? `/api/admin/announcements/${announcement.id}` 
        : '/api/admin/announcements'
      
      const method = announcement ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          type,
          target_audience: 'all' // hardcoded to all as per new logic
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to save announcement')
      } else {
        toast.success(announcement ? 'Announcement updated' : 'Announcement created')
        onSuccess()
        onOpenChange(false)
      }
    } catch (err: any) {
      toast.error('Failed to save announcement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{announcement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
          <DialogDescription>
            {type === 'email' && !announcement 
              ? "Warning: Saving this will immediately trigger a broadcast email to ALL users." 
              : "Announcements appear at the top of the dashboard for all users."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="E.g., System Maintenance" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea 
              id="body" 
              value={body} 
              onChange={(e) => setBody(e.target.value)} 
              placeholder="Write the announcement content here..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v || 'banner')} disabled={!!announcement && announcement.type === 'email'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="banner">Dashboard Banner Only</SelectItem>
                <SelectItem value="email">Banner + Email Broadcast</SelectItem>
              </SelectContent>
            </Select>
            {!!announcement && announcement.type === 'email' && (
              <p className="text-xs text-muted-foreground mt-1">
                You cannot change the type of an already-sent email broadcast.
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white">
              {loading ? 'Saving...' : 'Save Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
