'use client'

import React, { useState, useMemo, useTransition } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Sliders,
  Radio,
  Share2,
  Building2,
  FileCode,
  Layers,
  Activity,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  SlidersHorizontal,
  BookmarkPlus,
  Send,
  Eye,
  Info,
  MoreVertical
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import { format, formatDistanceToNow, isAfter, subDays, subHours } from 'date-fns'
import { recordAuditCheckpointAction } from './actions'

export interface AuditLogItem {
  id: string
  created_at: string
  action_type: string
  target_id: string | null
  target_type: string | null
  details: Record<string, any> | null
  admin_id: string | null
  admin?: {
    id?: string
    email?: string
    full_name?: string
    username?: string
    role?: string
  } | null
}

interface AuditClientProps {
  initialLogs: AuditLogItem[]
}

type ActionCategory =
  | 'security'
  | 'governance'
  | 'ai'
  | 'communications'
  | 'growth'
  | 'institution'
  | 'system'

export function AuditClient({ initialLogs = [] }: AuditClientProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs)
  const [isPending, startTransition] = useTransition()
  const [refreshing, setRefreshing] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Drawer Dossier Inspection State
  const [inspectedLog, setInspectedLog] = useState<AuditLogItem | null>(null)

  // Checkpoint Modal State
  const [checkpointOpen, setCheckpointOpen] = useState(false)
  const [chkActionType, setChkActionType] = useState('QUARTERLY_ACCESS_REVIEW')
  const [chkNotes, setChkNotes] = useState('')
  const [chkTargetType, setChkTargetType] = useState('compliance_checkpoint')
  const [isSubmittingCheckpoint, setIsSubmittingCheckpoint] = useState(false)

  // Action Classification Helper
  const getActionCategory = (action: string): ActionCategory => {
    const act = (action || '').toLowerCase()
    if (act.includes('role') || act.includes('suspend') || act.includes('auth') || act.includes('login') || act.includes('password')) {
      return 'security'
    }
    if (act.includes('setting') || act.includes('maintenance') || act.includes('quota') || act.includes('policy')) {
      return 'governance'
    }
    if (act.includes('ai') || act.includes('provider') || act.includes('benchmark') || act.includes('cache')) {
      return 'ai'
    }
    if (act.includes('announcement') || act.includes('broadcast') || act.includes('email') || act.includes('notice')) {
      return 'communications'
    }
    if (act.includes('referral') || act.includes('reward') || act.includes('promo')) {
      return 'growth'
    }
    if (act.includes('institution') || act.includes('domain') || act.includes('campus')) {
      return 'institution'
    }
    return 'system'
  }

  // Visual Category Badge
  const renderCategoryBadge = (action: string) => {
    const category = getActionCategory(action)
    switch (category) {
      case 'security':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/60">
            <ShieldAlert className="w-3 h-3 text-red-600 dark:text-red-400" />
            Security & Access
          </span>
        )
      case 'governance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            <Sliders className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            Governance & Rules
          </span>
        )
      case 'ai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60">
            <Terminal className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            AI Gateway
          </span>
        )
      case 'communications':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-plum-500)]/15 text-[var(--color-plum-700)] dark:text-[var(--color-plum-300)] border border-[var(--color-plum-500)]/30">
            <Radio className="w-3 h-3 text-[var(--color-plum-500)]" />
            Broadcast
          </span>
        )
      case 'growth':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
            <Share2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Growth & Rewards
          </span>
        )
      case 'institution':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900/60">
            <Building2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            Campus
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            <Activity className="w-3 h-3 text-slate-500" />
            Compliance
          </span>
        )
    }
  }

  // Target Type Badge Helper
  const renderTargetTypeBadge = (targetType: string | null) => {
    if (!targetType) return <span className="text-muted-foreground text-xs">—</span>
    return (
      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted border border-border text-foreground">
        {targetType}
      </span>
    )
  }

  // Refresh Logs from API
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      window.location.reload()
    } finally {
      setRefreshing(false)
    }
  }

  // Create Audit Checkpoint
  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chkActionType.trim()) return

    setIsSubmittingCheckpoint(true)
    const res = await recordAuditCheckpointAction({
      actionType: chkActionType.trim(),
      notes: chkNotes.trim(),
      targetType: chkTargetType
    })
    setIsSubmittingCheckpoint(false)

    if (res.success && res.data) {
      toast.success('Security audit checkpoint successfully recorded')
      setLogs(prev => [res.data, ...prev])
      setCheckpointOpen(false)
      setChkNotes('')
    } else {
      toast.error(res.error || 'Failed to record audit checkpoint')
    }
  }

  // Copy JSON helper
  const handleCopyJson = (details: any) => {
    const formatted = JSON.stringify(details || {}, null, 2)
    navigator.clipboard.writeText(formatted)
    toast.success('Audit event JSON copied to clipboard')
  }

  // Copy ID helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success(`Copied ID: ${id}`)
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Event_ID', 'Timestamp', 'Action_Type', 'Category', 'Admin_Actor', 'Target_Type', 'Target_ID', 'Details_JSON']
    const rows = filteredLogs.map(l => [
      l.id,
      l.created_at,
      l.action_type,
      getActionCategory(l.action_type),
      l.admin?.email || l.admin_id || 'System Automation',
      l.target_type || '',
      l.target_id || '',
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `unistudy-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Audit trail exported to CSV')
  }

  // Export Full JSON Ledger
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `unistudy-compliance-ledger-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Full JSON compliance ledger exported')
  }

  // Computed Telemetry Metrics
  const stats = useMemo(() => {
    const total = logs.length
    const now = new Date()
    const last24h = logs.filter(l => isAfter(new Date(l.created_at), subHours(now, 24))).length

    const securityCount = logs.filter(l => getActionCategory(l.action_type) === 'security').length
    const governanceCount = logs.filter(l => getActionCategory(l.action_type) === 'governance').length
    const aiCount = logs.filter(l => getActionCategory(l.action_type) === 'ai').length
    const commsCount = logs.filter(l => getActionCategory(l.action_type) === 'communications').length
    const growthCount = logs.filter(l => getActionCategory(l.action_type) === 'growth').length
    const institutionCount = logs.filter(l => getActionCategory(l.action_type) === 'institution').length

    const uniqueAdmins = new Set(logs.map(l => l.admin?.email || l.admin_id).filter(Boolean)).size
    const uniqueTargets = new Set(logs.map(l => l.target_id).filter(Boolean)).size

    return {
      total,
      last24h,
      securityCount,
      governanceCount,
      aiCount,
      commsCount,
      growthCount,
      institutionCount,
      uniqueAdmins,
      uniqueTargets
    }
  }, [logs])

  // Extract distinct target types for selector
  const targetTypeOptions = useMemo(() => {
    const set = new Set<string>()
    logs.forEach(l => {
      if (l.target_type) set.add(l.target_type)
    })
    return Array.from(set).sort()
  }, [logs])

  // Filtered & Sorted Logs
  const filteredLogs = useMemo(() => {
    let result = [...logs]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        l =>
          l.action_type.toLowerCase().includes(q) ||
          (l.admin?.email && l.admin.email.toLowerCase().includes(q)) ||
          (l.target_id && l.target_id.toLowerCase().includes(q)) ||
          (l.target_type && l.target_type.toLowerCase().includes(q)) ||
          (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
      )
    }

    if (categoryFilter !== 'all') {
      result = result.filter(l => getActionCategory(l.action_type) === categoryFilter)
    }

    if (targetTypeFilter !== 'all') {
      result = result.filter(l => l.target_type === targetTypeFilter)
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      if (dateFilter === '24h') {
        result = result.filter(l => isAfter(new Date(l.created_at), subHours(now, 24)))
      } else if (dateFilter === '7d') {
        result = result.filter(l => isAfter(new Date(l.created_at), subDays(now, 7)))
      } else if (dateFilter === '30d') {
        result = result.filter(l => isAfter(new Date(l.created_at), subDays(now, 30)))
      }
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }

    return result
  }, [logs, searchQuery, categoryFilter, targetTypeFilter, dateFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredLogs.slice(start, start + itemsPerPage)
  }, [filteredLogs, currentPage, itemsPerPage])

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            <span>Administration</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Governance & Compliance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[var(--color-plum-500)]" />
            Immutable Security Audit Log & Compliance Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Cryptographically anchored tamper-evident activity ledger of all administrative mutations, privilege assignments, platform configuration changes, and emergency overrides.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer outline-none">
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                Export as CSV Spreadsheet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileCode className="w-4 h-4 mr-2 text-purple-500" />
                Export Full JSON Ledger
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => setCheckpointOpen(true)}
            className="h-9 gap-1.5 bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white shadow-sm"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Record Checkpoint</span>
          </Button>
        </div>
      </div>

      {/* 2. Executive Telemetry Strip (5 KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Recorded Events</span>
            <Activity className="w-4 h-4 text-[var(--color-plum-500)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{stats.last24h}</span>
            <span>in last 24 hours</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Security & Access</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.securityCount}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Privileges & bans</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Governance Shifts</span>
            <Sliders className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.governanceCount}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Config & toggles</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Admin Actors</span>
            <User className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.uniqueAdmins || 1}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Unique operator keys</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Target Entities</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.uniqueTargets || stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Distinct targets</span>
          </div>
        </Card>
      </div>

      {/* 3. Category Distribution Bar */}
      <Card className="border-border/70 p-4 bg-gradient-to-r from-card via-background to-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--color-plum-500)]" />
            <h3 className="text-sm font-semibold text-foreground">Action Spectrum Distribution</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            SOC2 / ISO27001 audit compliance trail active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div
            onClick={() => setCategoryFilter('security')}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:bg-muted/40 ${
              categoryFilter === 'security' ? 'border-red-500 bg-red-500/5' : 'border-border/60'
            }`}
          >
            <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-tight flex items-center justify-between">
              <span>Security</span>
              <span>{stats.securityCount}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">Role & Ban events</div>
          </div>

          <div
            onClick={() => setCategoryFilter('governance')}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:bg-muted/40 ${
              categoryFilter === 'governance' ? 'border-blue-500 bg-blue-500/5' : 'border-border/60'
            }`}
          >
            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center justify-between">
              <span>Governance</span>
              <span>{stats.governanceCount}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">Platform settings</div>
          </div>

          <div
            onClick={() => setCategoryFilter('ai')}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:bg-muted/40 ${
              categoryFilter === 'ai' ? 'border-purple-500 bg-purple-500/5' : 'border-border/60'
            }`}
          >
            <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-tight flex items-center justify-between">
              <span>AI Gateway</span>
              <span>{stats.aiCount}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">Cache & provider pings</div>
          </div>

          <div
            onClick={() => setCategoryFilter('communications')}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:bg-muted/40 ${
              categoryFilter === 'communications' ? 'border-[var(--color-plum-500)] bg-[var(--color-plum-500)]/5' : 'border-border/60'
            }`}
          >
            <div className="text-[11px] font-semibold text-[var(--color-plum-700)] dark:text-[var(--color-plum-300)] uppercase tracking-tight flex items-center justify-between">
              <span>Broadcasts</span>
              <span>{stats.commsCount}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">Announcements & blasts</div>
          </div>

          <div
            onClick={() => setCategoryFilter('growth')}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:bg-muted/40 ${
              categoryFilter === 'growth' ? 'border-emerald-500 bg-emerald-500/5' : 'border-border/60'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight flex items-center justify-between">
              <span>Growth</span>
              <span>{stats.growthCount}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">Referrals & rewards</div>
          </div>

          <div
            onClick={() => setCategoryFilter('institution')}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:bg-muted/40 ${
              categoryFilter === 'institution' ? 'border-cyan-500 bg-cyan-500/5' : 'border-border/60'
            }`}
          >
            <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-tight flex items-center justify-between">
              <span>Campuses</span>
              <span>{stats.institutionCount}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">Institutional registry</div>
          </div>
        </div>
      </Card>

      {/* 4. Filter Toolbar & Search Bar */}
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
              placeholder="Search audit trail by action keyword, admin email, target ID, or JSON details..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filters & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={v => {
                setCategoryFilter(v || 'all')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[145px] h-9 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="security">Security & Access</SelectItem>
                <SelectItem value="governance">Governance</SelectItem>
                <SelectItem value="ai">AI Gateway</SelectItem>
                <SelectItem value="communications">Broadcasts</SelectItem>
                <SelectItem value="growth">Growth & Referrals</SelectItem>
                <SelectItem value="institution">Campuses</SelectItem>
              </SelectContent>
            </Select>

            {/* Target Type Filter */}
            {targetTypeOptions.length > 0 && (
              <Select
                value={targetTypeFilter}
                onValueChange={v => {
                  setTargetTypeFilter(v || 'all')
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  {targetTypeOptions.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Filter */}
            <Select
              value={dateFilter}
              onValueChange={(v: any) => {
                setDateFilter(v || 'all')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[125px] h-9 text-xs">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Past 24 Hours</SelectItem>
                <SelectItem value="7d">Past 7 Days</SelectItem>
                <SelectItem value="30d">Past 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select
              value={sortBy}
              onValueChange={(v: any) => setSortBy(v || 'newest')}
            >
              <SelectTrigger className="w-[125px] h-9 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/40">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Data Table View"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'timeline' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Timeline Stream View"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(searchQuery || categoryFilter !== 'all' || targetTypeFilter !== 'all' || dateFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <span>Filtered by:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 py-0.5">
                Query: "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 py-0.5">
                Category: {categoryFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
              </Badge>
            )}
            {targetTypeFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 py-0.5">
                Target: {targetTypeFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setTargetTypeFilter('all')} />
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 py-0.5">
                Date: {dateFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setDateFilter('all')} />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setTargetTypeFilter('all')
                setDateFilter('all')
              }}
              className="h-6 text-[11px] px-2 text-destructive hover:bg-destructive/10"
            >
              Clear All
            </Button>
          </div>
        )}
      </Card>

      {/* 5. Audit Log Directory (Table or Timeline Stream) */}
      {viewMode === 'table' ? (
        <Card className="border-border/70 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Admin Actor</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Payload Summary</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mb-3" />
                        <h4 className="text-sm font-semibold text-foreground">No audit records match query</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          Try adjusting search keywords or category filters, or record a verification checkpoint.
                        </p>
                        <Button size="sm" onClick={() => setCheckpointOpen(true)} className="gap-1.5">
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>Record Checkpoint</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map(item => (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/20 transition-colors cursor-pointer ${
                        inspectedLog?.id === item.id ? 'bg-muted/30 font-medium' : ''
                      }`}
                      onClick={() => setInspectedLog(item)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {format(new Date(item.created_at), 'MMM d, yyyy HH:mm:ss')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderCategoryBadge(item.action_type)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/70">
                          {item.action_type}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-foreground">
                          {item.admin?.email || (item.admin_id ? `Admin #${item.admin_id.slice(0, 8)}` : 'System Task')}
                        </div>
                        {item.admin?.role && (
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            {item.admin.role}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {renderTargetTypeBadge(item.target_type)}
                          {item.target_id && (
                            <span className="font-mono text-[11px] text-muted-foreground max-w-[100px] truncate" title={item.target_id}>
                              #{item.target_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="font-mono text-[11px] text-muted-foreground truncate" title={JSON.stringify(item.details)}>
                          {item.details ? JSON.stringify(item.details) : '—'}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setInspectedLog(item)}
                            title="Inspect dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors outline-none cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setInspectedLog(item)}>
                                <Eye className="w-4 h-4 mr-2 text-blue-500" />
                                Inspect Event Dossier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyId(item.id)}>
                                <Copy className="w-4 h-4 mr-2 text-emerald-500" />
                                Copy Event ID
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyJson(item.details)}>
                                <FileCode className="w-4 h-4 mr-2 text-purple-500" />
                                Copy JSON Payload
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
        /* Timeline Activity Stream */
        <Card className="border-border/70 p-6">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {paginatedLogs.map(item => (
              <div
                key={item.id}
                className="relative cursor-pointer group"
                onClick={() => setInspectedLog(item)}
              >
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[var(--color-plum-500)] border-2 border-background ring-2 ring-border"></div>

                <div className="p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/20 transition-all hover:shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderCategoryBadge(item.action_type)}
                      <span className="font-mono text-xs font-bold text-foreground">
                        {item.action_type}
                      </span>
                      {renderTargetTypeBadge(item.target_type)}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(new Date(item.created_at), 'MMM d, yyyy HH:mm:ss')} (
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })})
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                    <span>Initiated by:</span>
                    <strong className="text-foreground">
                      {item.admin?.email || item.admin_id || 'System Task'}
                    </strong>
                    {item.target_id && (
                      <>
                        <span>&bull;</span>
                        <span>Target: #{item.target_id}</span>
                      </>
                    )}
                  </div>

                  {item.details && (
                    <pre className="p-2.5 rounded bg-muted/60 text-[11px] font-mono text-muted-foreground overflow-x-auto">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <div>
          Showing {paginatedLogs.length} of {filteredLogs.length} audit records
          {filteredLogs.length !== logs.length && ` (filtered from ${logs.length})`}
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

      {/* 6. Event Dossier Inspection Drawer (Sheet) */}
      <Sheet open={!!inspectedLog} onOpenChange={open => !open && setInspectedLog(null)}>
        <SheetContent className="sm:max-w-xl w-full flex flex-col justify-between overflow-y-auto">
          {inspectedLog && (
            <div>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-2 mb-1">
                  {renderCategoryBadge(inspectedLog.action_type)}
                  <span className="text-[11px] font-mono text-muted-foreground">#{inspectedLog.id.slice(0, 12)}</span>
                </div>
                <SheetTitle className="text-lg font-bold font-mono tracking-tight text-foreground">
                  {inspectedLog.action_type}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Event recorded on {format(new Date(inspectedLog.created_at), 'MMMM d, yyyy at HH:mm:ss UTC')} (
                  {formatDistanceToNow(new Date(inspectedLog.created_at), { addSuffix: true })})
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 py-5 text-xs">
                {/* Actor & Authorization Block */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 space-y-2">
                  <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Administrator Actor
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Email Account:</span>
                      <strong className="text-foreground">{inspectedLog.admin?.email || 'Automated Internal Actor'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Privilege Role:</span>
                      <span className="capitalize text-foreground font-mono">{inspectedLog.admin?.role || 'admin'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Full Name:</span>
                      <span className="text-foreground">{inspectedLog.admin?.full_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Actor UUID:</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate block" title={inspectedLog.admin_id || ''}>
                        {inspectedLog.admin_id || 'System'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Entity Block */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 space-y-2">
                  <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    Target Mutation Scope
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Target Entity Type:</span>
                      <span className="font-mono font-bold text-foreground">{inspectedLog.target_type || 'platform'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Target ID:</span>
                      <span className="font-mono text-[11px] text-muted-foreground truncate block" title={inspectedLog.target_id || ''}>
                        {inspectedLog.target_id || 'Global'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Structured JSON Payload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                      Cryptographic Payload & Changeset
                    </Label>
                    <button
                      onClick={() => handleCopyJson(inspectedLog.details)}
                      className="text-[11px] text-[var(--color-plum-500)] hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy JSON
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border border-zinc-800">
                    {JSON.stringify(inspectedLog.details || {}, null, 2)}
                  </pre>
                </div>

                {/* Verification Stamp */}
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px]">Cryptographically Signed & Locked</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      This entry is immutable and stored with Supabase Row Level Security policy forbidding client deletions and updates.
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-border flex flex-row items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyId(inspectedLog.id)}
                  className="gap-1.5 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Event ID</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setInspectedLog(null)}
                  className="bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white text-xs"
                >
                  Close Dossier
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 7. Record Compliance Checkpoint Modal */}
      <Dialog open={checkpointOpen} onOpenChange={setCheckpointOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold">Record Compliance Checkpoint</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Log an official immutable governance checkpoint into the compliance audit trail for security audits and FERPA review.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCheckpoint} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="actionType" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Checkpoint Tag / Action Type
              </Label>
              <Input
                id="actionType"
                value={chkActionType}
                onChange={e => setChkActionType(e.target.value.toUpperCase())}
                placeholder="e.g. QUARTERLY_ACCESS_REVIEW"
                className="font-mono text-sm uppercase"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Scope Type
              </Label>
              <Select
                value={chkTargetType}
                onValueChange={v => setChkTargetType(v || 'compliance_checkpoint')}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance_checkpoint">General Compliance Checkpoint</SelectItem>
                  <SelectItem value="access_review">Access Control & Role Audit</SelectItem>
                  <SelectItem value="security_patch">Security Patch Sign-Off</SelectItem>
                  <SelectItem value="ferpa_compliance">FERPA / Academic Data Audit</SelectItem>
                  <SelectItem value="disaster_recovery_test">Disaster Recovery Drills</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verification Notes & Evidence Summary
              </Label>
              <Textarea
                id="notes"
                value={chkNotes}
                onChange={e => setChkNotes(e.target.value)}
                placeholder="Detail verification results, ticket references, or audit checklist confirmation..."
                rows={3}
                className="text-xs resize-none leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCheckpointOpen(false)}
                disabled={isSubmittingCheckpoint}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCheckpoint || !chkActionType.trim()}
                className="bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isSubmittingCheckpoint ? 'Recording...' : 'Record Checkpoint'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
