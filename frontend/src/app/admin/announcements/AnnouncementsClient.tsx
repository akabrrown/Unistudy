'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Megaphone,
  Radio,
  Send,
  AlertTriangle,
  Mail,
  LayoutTemplate,
  Building2,
  Users,
  Crown,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldAlert,
  Bell,
  CheckCircle2,
  X,
  Laptop,
  Moon,
  Sun,
  Layers,
  Info,
  SlidersHorizontal,
  BookmarkPlus,
  GraduationCap
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'

export interface AnnouncementItem {
  id: string
  title: string
  body: string
  type: 'banner' | 'critical' | 'modal' | 'email' | string
  target: string
  created_at: string
}

export interface AnnouncementStats {
  totalBroadcasts: number
  activeBanners: number
  totalStudents: number
  paidStudents: number
  freeStudents: number
  emailCount: number
  criticalCount: number
  modalCount: number
}

export interface InstitutionOption {
  id: string
  name: string
  abbreviation: string
  student_count: number
}

interface AnnouncementsClientProps {
  initialAnnouncements?: AnnouncementItem[]
  initialStats?: AnnouncementStats
  initialInstitutions?: InstitutionOption[]
}

const BROADCAST_TEMPLATES = [
  {
    id: 'maintenance',
    title: 'Scheduled System Maintenance Window',
    body: 'UniStudy AI core infrastructure will undergo scheduled performance maintenance this Sunday from 02:00 to 04:00 UTC. Past paper downloads and offline notes remain accessible.',
    type: 'critical',
    target: 'all',
    icon: ShieldAlert,
    tag: 'Maintenance',
    color: 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400'
  },
  {
    id: 'past-papers',
    title: '2026 Semester Exam Past Paper Bank Live',
    body: 'Over 140+ vetted midterm and final exam past questions with step-by-step marking rubrics have just been added to the Academic Repository. Check your course dashboard.',
    type: 'banner',
    target: 'all',
    icon: BookmarkPlus,
    tag: 'Academic Release',
    color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
  },
  {
    id: 'ai-reasoning',
    title: 'AI Tutor V3.5 Reasoning Engine Enabled',
    body: 'Upgraded STEM multi-step equation reasoning and KaTeX rendering are now live across all slide explanations and lecture voice recaps.',
    type: 'banner',
    target: 'tier:pro',
    icon: Bell,
    tag: 'Feature Upgrade',
    color: 'border-plum-500/20 bg-plum-500/5 text-plum-700 dark:text-plum-400'
  },
  {
    id: 'campus-midterms',
    title: 'Campus Midterm Revision Schedule',
    body: 'Synchronized campus lecture notes and past question discussion threads are now open for Level 200 & 300 engineering and business courses.',
    type: 'banner',
    target: 'campus:UG',
    icon: Building2,
    tag: 'Campus Bulletin',
    color: 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400'
  },
  {
    id: 'honor-code',
    title: 'Academic Integrity & Exam Conduct Advisory',
    body: 'Please review the 2026 UniStudy Academic Integrity Guidelines. AI notes generation is designed for comprehension reinforcement and must comply with campus honor codes.',
    type: 'banner',
    target: 'all',
    icon: Info,
    tag: 'Policy Advisory',
    color: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400'
  }
]

export function AnnouncementsClient({
  initialAnnouncements = [],
  initialStats,
  initialInstitutions = []
}: AnnouncementsClientProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements)
  const [stats, setStats] = useState<AnnouncementStats>(initialStats || {
    totalBroadcasts: initialAnnouncements.length,
    activeBanners: initialAnnouncements.filter(a => a.type === 'banner' || a.type === 'critical').length,
    totalStudents: 1420,
    paidStudents: 310,
    freeStudents: 1110,
    emailCount: initialAnnouncements.filter(a => a.type === 'email').length,
    criticalCount: initialAnnouncements.filter(a => a.type === 'critical').length,
    modalCount: 0
  })
  const [institutions, setInstitutions] = useState<InstitutionOption[]>(initialInstitutions)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [targetFilter, setTargetFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Interactive Live Preview Simulator Selection
  const [selectedPreview, setSelectedPreview] = useState<AnnouncementItem | null>(
    initialAnnouncements[0] || {
      id: 'demo-1',
      title: 'Welcome to UniStudy AI Academic Portal',
      body: 'Explore your lecture summaries, past questions, and flashcard sets in one unified dashboard.',
      type: 'banner',
      target: 'all',
      created_at: new Date().toISOString()
    }
  )
  const [simulatorTheme, setSimulatorTheme] = useState<'dark' | 'light'>('light')

  // Composer Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null)
  const [composerTitle, setComposerTitle] = useState('')
  const [composerBody, setComposerBody] = useState('')
  const [composerType, setComposerType] = useState<string>('banner')
  const [composerTarget, setComposerTarget] = useState<string>('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Email confirmation modal
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load announcements from API
  const fetchAnnouncements = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/admin/announcements')
      const json = await res.json()
      if (res.ok) {
        if (Array.isArray(json)) {
          setAnnouncements(json)
        } else if (json.announcements) {
          setAnnouncements(json.announcements)
          if (json.stats) setStats(json.stats)
          if (json.institutions) setInstitutions(json.institutions)
        }
      } else {
        toast.error(json.error || 'Failed to load announcements')
      }
    } catch (err: any) {
      toast.error('Network error loading announcements')
    } finally {
      setRefreshing(false)
    }
  }

  // Open composer for create
  const handleOpenCreate = () => {
    setEditingItem(null)
    setComposerTitle('')
    setComposerBody('')
    setComposerType('banner')
    setComposerTarget('all')
    setDrawerOpen(true)
  }

  // Open composer with template
  const handleApplyTemplate = (tpl: typeof BROADCAST_TEMPLATES[0]) => {
    setEditingItem(null)
    setComposerTitle(tpl.title)
    setComposerBody(tpl.body)
    setComposerType(tpl.type)
    setComposerTarget(tpl.target)
    setDrawerOpen(true)
    toast.info(`Loaded "${tpl.tag}" template into composer`)
  }

  // Open composer for edit
  const handleOpenEdit = (item: AnnouncementItem) => {
    setEditingItem(item)
    setComposerTitle(item.title)
    setComposerBody(item.body)
    setComposerType(item.type || 'banner')
    setComposerTarget(item.target || 'all')
    setDrawerOpen(true)
  }

  // Duplicate item
  const handleDuplicate = (item: AnnouncementItem) => {
    setEditingItem(null)
    setComposerTitle(`${item.title} (Copy)`)
    setComposerBody(item.body)
    setComposerType(item.type || 'banner')
    setComposerTarget(item.target || 'all')
    setDrawerOpen(true)
    toast.info('Copied broadcast contents into composer')
  }

  // Save announcement (Create or Update)
  const handleSaveAnnouncement = async () => {
    if (!composerTitle.trim() || !composerBody.trim()) {
      toast.error('Title and message content are required')
      return
    }

    if (composerType === 'email' && !editingItem && !showEmailConfirmDialog) {
      setShowEmailConfirmDialog(true)
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingItem
        ? `/api/admin/announcements/${editingItem.id}`
        : '/api/admin/announcements'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: composerTitle.trim(),
          body: composerBody.trim(),
          type: composerType,
          target: composerTarget
        })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to save broadcast')
      } else {
        toast.success(editingItem ? 'Broadcast updated successfully' : 'Broadcast launched successfully')
        setDrawerOpen(false)
        setShowEmailConfirmDialog(false)
        fetchAnnouncements(true)
        if (!editingItem && data) {
          setSelectedPreview(data)
        }
      }
    } catch (err: any) {
      toast.error('Error saving announcement')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete announcement
  const confirmDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/announcements/${deleteId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Broadcast retracted and removed')
        setDeleteId(null)
        fetchAnnouncements(true)
      } else {
        toast.error(data.error || 'Failed to delete broadcast')
      }
    } catch (err: any) {
      toast.error('Network error deleting broadcast')
    } finally {
      setIsDeleting(false)
    }
  }

  // Markdown helper buttons
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    setComposerBody(prev => `${prev} ${prefix}text${suffix} `)
  }

  // Filtered and sorted list
  const filteredAnnouncements = useMemo(() => {
    let result = [...announcements]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q) ||
          (a.target && a.target.toLowerCase().includes(q))
      )
    }

    if (channelFilter !== 'all') {
      result = result.filter(a => (a.type || 'banner') === channelFilter)
    }

    if (targetFilter !== 'all') {
      if (targetFilter === 'campus') {
        result = result.filter(a => a.target && a.target.startsWith('campus:'))
      } else {
        result = result.filter(a => (a.target || 'all') === targetFilter)
      }
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title))
    }

    return result
  }, [announcements, searchQuery, channelFilter, targetFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage) || 1
  const paginatedAnnouncements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAnnouncements.slice(start, start + itemsPerPage)
  }, [filteredAnnouncements, currentPage, itemsPerPage])

  // Estimated reach calculation helper
  const getEstimatedReach = (target: string) => {
    if (!target || target === 'all') return `${stats.totalStudents} students (100% of UPSA)`
    if (target === 'tier:pro') return `${stats.paidStudents} Pro/Ultra students (${Math.round((stats.paidStudents / (stats.totalStudents || 1)) * 100)}%)`
    if (target === 'tier:free') return `${stats.freeStudents} Free Tier students (${Math.round((stats.freeStudents / (stats.totalStudents || 1)) * 100)}%)`
    if (target.startsWith('faculty:')) {
      const code = target.replace('faculty:', '')
      return `~${Math.round(stats.totalStudents * 0.25)} students in UPSA ${code}`
    }
    if (target.startsWith('level:')) {
      const lvl = target.replace('level:', '')
      return `~${Math.round(stats.totalStudents * 0.28)} students in UPSA Level ${lvl}`
    }
    return 'Targeted UPSA student cohort'
  }

  // Channel badge helper
  const renderChannelBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
            Critical Alert
          </span>
        )
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
            <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            Email Broadcast
          </span>
        )
      case 'modal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
            <Radio className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Modal Dialog
          </span>
        )
      case 'banner':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            <LayoutTemplate className="w-3 h-3 text-slate-600 dark:text-slate-400" />
            Top Banner
          </span>
        )
    }
  }

  // Target audience badge helper
  const renderTargetBadge = (target: string) => {
    if (!target || target === 'all') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Users className="w-3 h-3 text-muted-foreground" />
          All Students
        </span>
      )
    }
    if (target === 'tier:pro') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <Crown className="w-3 h-3 text-amber-500" />
          Pro / Ultra
        </span>
      )
    }
    if (target === 'tier:free') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <Users className="w-3 h-3" />
          Free Tier
        </span>
      )
    }
    if (target.startsWith('campus:')) {
      const campus = target.replace('campus:', '')
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
          <Building2 className="w-3 h-3 text-blue-500" />
          {campus}
        </span>
      )
    }
    return <span className="text-xs text-muted-foreground">{target}</span>
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Content', 'Channel', 'Target_Audience', 'Created_At']
    const rows = filteredAnnouncements.map(a => [
      a.id,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.body.replace(/"/g, '""')}"`,
      a.type || 'banner',
      a.target || 'all',
      a.created_at
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `unistudy-announcements-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Announcements catalog exported to CSV')
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            <span>Administration</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Communications & Broadcasts</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-[var(--color-plum-500)]" />
            Broadcast Console & Announcement Deck
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Orchestrate multi-channel system announcements, campus bulletins, and email blasts across the UniStudy student network with live audience simulation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnnouncements()}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="h-9 gap-1.5 bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Broadcast</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards (5 Command Stats) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Broadcasts</span>
            <Radio className="w-4 h-4 text-[var(--color-plum-500)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.totalBroadcasts}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Platform-wide</span>
            <span>history</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Banners</span>
            <LayoutTemplate className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {stats.activeBanners}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Currently live on dashboard</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Audience Reach</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.totalStudents}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-blue-600 dark:text-blue-400 font-medium">{stats.paidStudents} Pro</span>
            <span>&bull;</span>
            <span>{stats.freeStudents} Free</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Email Blasts</span>
            <Mail className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.emailCount}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-muted-foreground">Via Resend transactional</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.criticalCount}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-red-600 dark:text-red-400 font-medium">Incident & maintenance</span>
          </div>
        </Card>
      </div>

      {/* 3. Preset Templates Shelf (Fast 1-Click Launchers) */}
      <Card className="border-border/70 bg-gradient-to-r from-muted/30 via-background to-muted/20">
        <CardHeader className="py-3.5 px-5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-[var(--color-plum-500)]" />
              <CardTitle className="text-sm font-semibold">Standard Operations Templates</CardTitle>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                1-Click Preset
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Click any template to auto-populate the broadcast composer
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {BROADCAST_TEMPLATES.map(tpl => {
            const Icon = tpl.icon
            return (
              <button
                key={tpl.id}
                onClick={() => handleApplyTemplate(tpl)}
                className={`text-left p-3 rounded-lg border transition-all hover:scale-[1.01] hover:shadow-sm flex flex-col justify-between ${tpl.color}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold tracking-tight uppercase opacity-90">{tpl.tag}</span>
                    <Icon className="w-3.5 h-3.5 opacity-80" />
                  </div>
                  <h4 className="text-xs font-semibold leading-tight line-clamp-2 text-foreground mb-1">
                    {tpl.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                    {tpl.body}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-medium opacity-80">
                  <span>Target: {tpl.target}</span>
                  <span className="flex items-center gap-0.5 hover:underline">
                    Use <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* 4. Live Visual Preview Simulator Sandbox (WYSIWYG) */}
      <Card className="border-border/70 overflow-hidden shadow-sm">
        <CardHeader className="py-3 px-5 bg-muted/40 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Student Dashboard Live Banner Simulator
                <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-background">
                  WYSIWYG Sandbox
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Simulates real-world rendering of the broadcast as seen by active students across device viewports.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Simulation Theme:</span>
            <div className="flex items-center bg-background border border-border rounded-md p-0.5">
              <button
                onClick={() => setSimulatorTheme('light')}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                  simulatorTheme === 'light' ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setSimulatorTheme('dark')}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                  simulatorTheme === 'dark' ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Moon className="w-3 h-3 text-blue-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 bg-muted/10">
          {/* Simulated Browser Frame */}
          <div
            className={`rounded-xl border shadow-md transition-colors overflow-hidden ${
              simulatorTheme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Mock Dashboard Topbar */}
            <div
              className={`px-4 py-2.5 border-b flex items-center justify-between text-xs ${
                simulatorTheme === 'dark' ? 'bg-zinc-900/90 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                </div>
                <span className="font-mono text-[11px] ml-2 font-medium">https://unistudy.ai/dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-[11px]">Previewing: {selectedPreview ? selectedPreview.title : 'No broadcast chosen'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-800 font-mono">
                  {selectedPreview?.target || 'all'}
                </span>
              </div>
            </div>

            {/* Mock Dashboard Content Area with Banner */}
            <div className="p-5 space-y-4">
              {/* Simulated Banner as rendered by AnnouncementBanner */}
              {selectedPreview ? (
                <div
                  className={`px-4 py-3 flex items-start sm:items-center justify-between gap-4 rounded-xl shadow-sm transition-all ${
                    selectedPreview.type === 'critical'
                      ? 'bg-red-600 text-white'
                      : selectedPreview.type === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[var(--color-plum-500)] text-white'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="bg-white/20 p-2 rounded-full shrink-0">
                      {selectedPreview.type === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-white" />
                      ) : selectedPreview.type === 'email' ? (
                        <Mail className="w-4 h-4 text-white" />
                      ) : (
                        <Megaphone className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <strong className="text-sm font-semibold whitespace-nowrap">{selectedPreview.title}</strong>
                      <span className="hidden sm:inline opacity-50">&bull;</span>
                      <span className="text-sm opacity-90 truncate max-w-2xl">{selectedPreview.body}</span>
                    </div>
                  </div>
                  <button
                    className="shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Dismiss announcement"
                    onClick={() => toast.info('In real dashboard, clicking X hides banner and caches dismissal in localStorage')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                  Select an announcement below or click "New Broadcast" to simulate banner rendering.
                </div>
              )}

              {/* Mock Dashboard Wireframe placeholder */}
              <div className="grid grid-cols-3 gap-3 opacity-30 pointer-events-none">
                <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
                <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
                <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Filter Toolbar & Search Bar */}
      <Card className="border-border/70 p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search announcements by title, content, or targeted campus..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filters & Views */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Channel filter */}
            <Select
              value={channelFilter}
              onValueChange={v => {
                setChannelFilter(v || 'all')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[145px] h-9 text-xs">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="banner">Top Banner</SelectItem>
                <SelectItem value="critical">Critical Alert</SelectItem>
                <SelectItem value="email">Email Broadcast</SelectItem>
                <SelectItem value="modal">Modal Dialog</SelectItem>
              </SelectContent>
            </Select>

            {/* Target Audience filter */}
            <Select
              value={targetFilter}
              onValueChange={v => {
                setTargetFilter(v || 'all')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[155px] h-9 text-xs">
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audiences</SelectItem>
                <SelectItem value="tier:pro">Pro / Ultra</SelectItem>
                <SelectItem value="tier:free">Free Tier</SelectItem>
                <SelectItem value="campus">Campus Specific</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort by */}
            <Select
              value={sortBy}
              onValueChange={v => setSortBy((v as any) || 'newest')}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/40">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table Density View"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'cards' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Card Grid View"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(searchQuery || channelFilter !== 'all' || targetFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <span>Filtered by:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 py-0.5">
                Query: "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {channelFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 py-0.5">
                Channel: {channelFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setChannelFilter('all')} />
              </Badge>
            )}
            {targetFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 py-0.5">
                Audience: {targetFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setTargetFilter('all')} />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setChannelFilter('all')
                setTargetFilter('all')
              }}
              className="h-6 text-[11px] px-2 text-destructive hover:bg-destructive/10"
            >
              Clear All
            </Button>
          </div>
        )}
      </Card>

      {/* 6. Broadcast Directory Content (Table or Card View) */}
      {viewMode === 'table' ? (
        <Card className="border-border/70 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Channel / Type</th>
                  <th className="px-4 py-3">Headline & Content Preview</th>
                  <th className="px-4 py-3">Target Audience</th>
                  <th className="px-4 py-3">Estimated Reach</th>
                  <th className="px-4 py-3">Dispatched</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedAnnouncements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <Radio className="w-8 h-8 text-muted-foreground/40 mb-3" />
                        <h4 className="text-sm font-semibold text-foreground">No broadcasts match criteria</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          Try adjusting search keywords or channel filters, or launch a new broadcast.
                        </p>
                        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Broadcast</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAnnouncements.map(item => (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/20 transition-colors group cursor-pointer ${
                        selectedPreview?.id === item.id ? 'bg-muted/30 font-medium' : ''
                      }`}
                      onClick={() => setSelectedPreview(item)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {renderChannelBadge(item.type || 'banner')}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-[340px]">
                        <div className="font-semibold text-foreground text-sm leading-tight flex items-center gap-2">
                          <span className="truncate">{item.title}</span>
                          {selectedPreview?.id === item.id && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 text-blue-600 dark:text-blue-400 border-blue-300">
                              Viewing
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                          {item.body}
                        </p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderTargetBadge(item.target || 'all')}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {getEstimatedReach(item.target || 'all')}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedPreview(item)}
                            title="Preview in simulator"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors outline-none cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => setSelectedPreview(item)}>
                                <Eye className="w-4 h-4 mr-2 text-blue-500" />
                                Inspect Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                                <Copy className="w-4 h-4 mr-2 text-emerald-500" />
                                Duplicate Content
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Edit className="w-4 h-4 mr-2 text-amber-500" />
                                Edit Broadcast
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteId(item.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Retract & Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedAnnouncements.map(item => (
            <Card
              key={item.id}
              className={`p-4 border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
                selectedPreview?.id === item.id ? 'border-[var(--color-plum-500)] ring-1 ring-[var(--color-plum-500)]/20' : 'border-border/70'
              }`}
              onClick={() => setSelectedPreview(item)}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  {renderChannelBadge(item.type || 'banner')}
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>

                <h3 className="font-semibold text-foreground text-sm mb-1.5 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                  {item.body}
                </p>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-1.5">
                  {renderTargetBadge(item.target || 'all')}
                </div>

                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleOpenEdit(item)}
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <div>
          Showing {paginatedAnnouncements.length} of {filteredAnnouncements.length} broadcasts
          {filteredAnnouncements.length !== announcements.length && ` (filtered from ${announcements.length})`}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="h-8 px-2.5 gap-1 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </Button>

          <span className="font-medium text-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="h-8 px-2.5 gap-1 text-xs"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 7. Create & Edit Composer Drawer (Sheet) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-xl w-full flex flex-col justify-between overflow-y-auto">
          <div>
            <SheetHeader className="pb-4 border-b border-border">
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                <Radio className="w-5 h-5 text-[var(--color-plum-500)]" />
                {editingItem ? 'Edit Broadcast Dispatch' : 'Compose New Platform Broadcast'}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Configure delivery channel, audience segmentation parameters, and live banner presentation.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 py-5">
              {/* Channel Type */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Delivery Channel
                </Label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setComposerType('banner')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      composerType === 'banner'
                        ? 'border-[var(--color-plum-500)] bg-[var(--color-plum-500)]/5 text-foreground'
                        : 'border-border hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <LayoutTemplate className="w-4 h-4 text-[var(--color-plum-500)] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Top Banner</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">Persistent dashboard alert</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposerType('critical')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      composerType === 'critical'
                        ? 'border-red-500 bg-red-500/10 text-foreground'
                        : 'border-border hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Critical Incident</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">High-visibility red warning</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposerType('email')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      composerType === 'email'
                        ? 'border-blue-500 bg-blue-500/10 text-foreground'
                        : 'border-border hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Email Blast + Banner</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">Dispatches Resend batch</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposerType('modal')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      composerType === 'modal'
                        ? 'border-purple-500 bg-purple-500/10 text-foreground'
                        : 'border-border hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <Radio className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Modal Dialog</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">Overlay popup on login</div>
                    </div>
                  </button>
                </div>

                {composerType === 'email' && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2 mt-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Email Dispatch Notice:</strong> This broadcast will trigger bulk outbound delivery via Resend in batches of 50 to targeted student email addresses.
                    </div>
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Headline Title
                  </Label>
                  <span className="text-[11px] text-muted-foreground">{composerTitle.length}/100</span>
                </div>
                <Input
                  id="title"
                  value={composerTitle}
                  onChange={e => setComposerTitle(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance Window This Sunday"
                  maxLength={100}
                  className="text-sm font-medium"
                />
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Broadcast Message Content
                  </Label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => insertMarkdown('**', '**')}
                      className="px-1.5 py-0.5 rounded bg-muted text-[11px] hover:bg-muted/80 font-bold"
                      title="Insert Bold Text"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('[link label](', ')')}
                      className="px-1.5 py-0.5 rounded bg-muted text-[11px] hover:bg-muted/80"
                      title="Insert Link"
                    >
                      Link
                    </button>
                    <span className="text-muted-foreground text-[11px] ml-1">{composerBody.length} chars</span>
                  </div>
                </div>
                <Textarea
                  id="body"
                  value={composerBody}
                  onChange={e => setComposerBody(e.target.value)}
                  placeholder="Provide detailed information, affected systems, relevant links, or instructions for students..."
                  rows={4}
                  className="text-sm resize-none leading-relaxed"
                />
              </div>

              {/* Audience Targeting Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Audience Segmentation Target
                </Label>
                <Select
                  value={composerTarget}
                  onValueChange={v => setComposerTarget(v || 'all')}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Select target cohort" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>All Students ({stats.totalStudents} total)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tier:pro">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Crown className="w-3.5 h-3.5" />
                        <span>Pro & Ultra Subscribers ({stats.paidStudents} students)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tier:free">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Free Tier Accounts ({stats.freeStudents} students)</span>
                      </div>
                    </SelectItem>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40">
                      UPSA Faculties & Levels
                    </div>
                    <SelectItem value="faculty:FITCS">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                        <span>FITCS (IT, Computer Science & Comm Studies)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="faculty:FAF">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Faculty of Accounting & Finance (FAF)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="faculty:FMS">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                        <span>Faculty of Management Studies (FMS)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="faculty:LAW">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                        <span>UPSA Law School (LLB Scholars)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="faculty:GRAD">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                        <span>School of Graduate Studies (MBA/MSc)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="level:100">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Level 100 Freshers Cohort</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="level:400">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-rose-500" />
                        <span>Level 400 Finalists Cohort</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                  <span>Estimated Reach:</span>
                  <span className="font-semibold text-foreground">{getEstimatedReach(composerTarget)}</span>
                </div>
              </div>

              {/* Instant Live Preview in Drawer */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Live Banner Preview
                </div>
                <div
                  className={`p-3 rounded-xl text-white text-xs flex items-center justify-between gap-3 shadow-sm ${
                    composerType === 'critical'
                      ? 'bg-red-600'
                      : composerType === 'email'
                      ? 'bg-blue-600'
                      : 'bg-[var(--color-plum-500)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-white/20 p-1.5 rounded-full shrink-0">
                      {composerType === 'critical' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Megaphone className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate">{composerTitle || 'Headline Title Preview'}</div>
                      <div className="opacity-90 truncate max-w-sm">{composerBody || 'Message preview content will appear here...'}</div>
                    </div>
                  </div>
                  <X className="w-3.5 h-3.5 shrink-0 opacity-80" />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-border flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveAnnouncement}
              disabled={isSubmitting || !composerTitle.trim() || !composerBody.trim()}
              className="bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Launching...' : editingItem ? 'Save Changes' : 'Dispatch Broadcast'}</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 8. Email Confirmation Safety Dialog */}
      <Dialog open={showEmailConfirmDialog} onOpenChange={setShowEmailConfirmDialog}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
              <Mail className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold">Confirm Mass Email Broadcast</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              You are about to dispatch an outbound mass email broadcast to{' '}
              <strong className="text-foreground">{getEstimatedReach(composerTarget)}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-muted/60 border border-border text-xs space-y-1.5 my-2">
            <div className="font-semibold text-foreground">{composerTitle}</div>
            <div className="text-muted-foreground line-clamp-3">{composerBody}</div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium pt-1">
              Sender: UniStudy &lt;hello@unistudy.ai&gt; via Resend Batch API
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAnnouncement}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Confirm & Dispatch Emails'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold">Retract & Delete Announcement?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will immediately remove the announcement banner from all student dashboards. Past email broadcasts already sent to student inboxes cannot be retracted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Announcement'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
