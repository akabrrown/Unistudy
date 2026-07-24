'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Edit, Trash2, Mail, LayoutTemplate } from 'lucide-react'
import { format } from 'date-fns'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AnnouncementModal, Announcement } from './AnnouncementModal'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements')
      const data = await res.json()
      if (res.ok) {
        setAnnouncements(data)
      } else {
        toast.error(data.error || 'Failed to load')
      }
    } catch (err) {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Announcement deleted')
        loadAnnouncements()
      } else {
        toast.error(data.error || 'Failed to delete')
      }
    } catch (err) {
      toast.error('Failed to delete announcement')
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setModalOpen(true)
  }

  const handleCreate = () => {
    setEditingAnnouncement(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <Card className="shadow-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>Manage platform-wide announcements and broadcasts.</CardDescription>
          </div>
          <Button onClick={handleCreate} className="bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white">
            <Plus className="w-4 h-4 mr-2" /> New Announcement
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Content Preview</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No announcements found.</td>
                  </tr>
                ) : (
                  announcements.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium">{a.title}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[300px] truncate" title={a.body}>
                        {a.body}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          a.type === 'email' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {a.type === 'email' ? <Mail className="w-3 h-3" /> : <LayoutTemplate className="w-3 h-3" />}
                          {a.type === 'email' ? 'Broadcast' : 'Banner'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(a.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground transition-colors outline-none cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(a)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(a.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AnnouncementModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onSuccess={loadAnnouncements} 
        announcement={editingAnnouncement}
      />
    </div>
  )
}
