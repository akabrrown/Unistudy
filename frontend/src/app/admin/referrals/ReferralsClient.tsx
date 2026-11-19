'use client'

import React, { useState, useMemo, useTransition } from 'react'
import {
  Users,
  UserCheck,
  Gift,
  Share2,
  Copy,
  Plus,
  RefreshCw,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Building2,
  Crown,
  TrendingUp,
  ShieldCheck,
  MoreVertical,
  Edit,
  Trash2,
  Layers,
  LayoutTemplate,
  Award,
  Flame,
  X,
  Check,
  ArrowUpRight
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  createReferralAction,
  updateReferralStatusAction,
  grantRewardMonthAction,
  deleteReferralAction,
  batchRewardReferralsAction
} from './actions'

export interface ReferralItem {
  id: string
  referral_code: string
  referred_email: string
  status: 'pending' | 'converted' | 'rewarded' | 'expired' | string
  months_awarded: number
  created_at: string
  referrer?: {
    id?: string
    email?: string
    full_name?: string
    username?: string
    subscription_tier?: string
    institutions?: {
      abbreviation?: string
      name?: string
    }
  } | null
}

export interface ReferralsClientProps {
  initialReferrals: ReferralItem[]
  totalStudentsCount?: number
}

export function ReferralsClient({
  initialReferrals = [],
  totalStudentsCount = 1420
}: ReferralsClientProps) {
  const [referrals, setReferrals] = useState<ReferralItem[]>(initialReferrals)
  const [isPending, startTransition] = useTransition()

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campusFilter, setCampusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rewards' | 'code'>('newest')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal / Drawer state for Provisioning Ambassador Code
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [provCode, setProvCode] = useState('')
  const [provReferrerEmail, setProvReferrerEmail] = useState('')
  const [provReferredEmail, setProvReferredEmail] = useState('')
  const [provMonths, setProvMonths] = useState(1)
  const [provStatus, setProvStatus] = useState<'pending' | 'converted'>('pending')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Single delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ReferralItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Generate random 8-character referral code
  const generateRandomCode = (prefix = 'UNI') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let rand = ''
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `${prefix}-${rand}`
  }

  const handleOpenProvision = (prefillCode?: string) => {
    setProvCode(prefillCode || generateRandomCode())
    setProvReferrerEmail('')
    setProvReferredEmail('')
    setProvMonths(1)
    setProvStatus('pending')
    setProvisionOpen(true)
  }

  // Provision ambassador code submit
  const handleSaveProvision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provCode.trim() || !provReferredEmail.trim()) {
      toast.error('Referral code and invitee email are required')
      return
    }

    setIsSubmitting(true)
    const res = await createReferralAction({
      referrerEmail: provReferrerEmail.trim(),
      referralCode: provCode.trim(),
      referredEmail: provReferredEmail.trim(),
      status: provStatus,
      monthsAwarded: provMonths
    })
    setIsSubmitting(false)

    if (res.success && res.data) {
      toast.success(`Referral code ${provCode} successfully created`)
      setReferrals(prev => [res.data, ...prev])
      setProvisionOpen(false)
    } else {
      toast.error(res.error || 'Failed to create referral code')
    }
  }

  // Update status single
  const handleStatusChange = async (id: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updateReferralStatusAction(id, newStatus)
      if (res.success) {
        toast.success(`Referral marked as ${newStatus}`)
        setReferrals(prev =>
          prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
        )
      } else {
        toast.error(res.error || 'Failed to update status')
      }
    })
  }

  // Grant +1 Reward Month
  const handleGrantRewardMonth = async (id: string) => {
    startTransition(async () => {
      const res = await grantRewardMonthAction(id)
      if (res.success) {
        toast.success(`Granted +1 free month of Pro (Total: ${res.monthsAwarded})`)
        setReferrals(prev =>
          prev.map(item =>
            item.id === id
              ? { ...item, status: 'rewarded', months_awarded: res.monthsAwarded || (item.months_awarded + 1) }
              : item
          )
        )
      } else {
        toast.error(res.error || 'Failed to grant reward month')
      }
    })
  }

  // Delete Referral
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const res = await deleteReferralAction(deleteTarget.id)
    setIsDeleting(false)

    if (res.success) {
      toast.success('Referral code deleted')
      setReferrals(prev => prev.filter(item => item.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      toast.error(res.error || 'Failed to delete referral')
    }
  }

  // Batch Reward Converted
  const handleBatchReward = async () => {
    const targets = selectedIds.length > 0
      ? selectedIds
      : referrals.filter(r => r.status === 'converted').map(r => r.id)

    if (!targets.length) {
      toast.info('No converted referrals available to reward')
      return
    }

    startTransition(async () => {
      const res = await batchRewardReferralsAction(targets)
      if (res.success) {
        toast.success(`Successfully rewarded ${res.count} student referrals with free Pro tier`)
        setReferrals(prev =>
          prev.map(item =>
            targets.includes(item.id)
              ? { ...item, status: 'rewarded', months_awarded: Math.max(1, item.months_awarded || 1) }
              : item
          )
        )
        setSelectedIds([])
      } else {
        toast.error(res.error || 'Batch reward failed')
      }
    })
  }

  // 1-Click Copy Link
  const handleCopyLink = (code: string) => {
    const url = `https://unistudy.ai/signup?ref=${encodeURIComponent(code)}`
    navigator.clipboard.writeText(url)
    toast.success(`Copied invite link: ${url}`)
  }

  // Multi-select toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedReferrals.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedReferrals.map(r => r.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
  }

  // Computed Growth Metrics
  const stats = useMemo(() => {
    const total = referrals.length
    const activeCodes = new Set(referrals.map(r => r.referral_code)).size
    const converted = referrals.filter(r => r.status === 'converted' || r.status === 'rewarded').length
    const rewarded = referrals.filter(r => r.status === 'rewarded').length
    const pending = referrals.filter(r => r.status === 'pending').length
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
    const totalMonthsAwarded = referrals.reduce((acc, curr) => acc + (Number(curr.months_awarded) || 0), 0)

    return {
      total,
      activeCodes,
      converted,
      rewarded,
      pending,
      conversionRate,
      totalMonthsAwarded
    }
  }, [referrals])

  // Extract distinct campuses for filter
  const campusOptions = useMemo(() => {
    const set = new Set<string>()
    referrals.forEach(r => {
      const abbr = r.referrer?.institutions?.abbreviation
      if (abbr) set.add(abbr)
    })
    return Array.from(set).sort()
  }, [referrals])

  // Top Referrers Leaderboard
  const topReferrers = useMemo(() => {
    const map = new Map<string, {
      email: string
      name: string
      campus: string
      totalInvites: number
      conversions: number
      monthsEarned: number
    }>()

    referrals.forEach(r => {
      const email = r.referrer?.email || 'Unknown Advocate'
      const existing = map.get(email) || {
        email,
        name: r.referrer?.full_name || email.split('@')[0],
        campus: r.referrer?.institutions?.abbreviation || 'Campus',
        totalInvites: 0,
        conversions: 0,
        monthsEarned: 0
      }

      existing.totalInvites += 1
      if (r.status === 'converted' || r.status === 'rewarded') {
        existing.conversions += 1
      }
      existing.monthsEarned += Number(r.months_awarded) || 0

      map.set(email, existing)
    })

    return Array.from(map.values())
      .sort((a, b) => b.conversions - a.conversions || b.totalInvites - a.totalInvites)
      .slice(0, 5)
  }, [referrals])

  // Filtered and Sorted referrals
  const filteredReferrals = useMemo(() => {
    let result = [...referrals]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        r =>
          r.referral_code.toLowerCase().includes(q) ||
          r.referred_email.toLowerCase().includes(q) ||
          (r.referrer?.email && r.referrer.email.toLowerCase().includes(q)) ||
          (r.referrer?.full_name && r.referrer.full_name.toLowerCase().includes(q)) ||
          (r.referrer?.institutions?.abbreviation && r.referrer.institutions.abbreviation.toLowerCase().includes(q))
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter)
    }

    if (campusFilter !== 'all') {
      result = result.filter(
        r => r.referrer?.institutions?.abbreviation?.toLowerCase() === campusFilter.toLowerCase()
      )
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortBy === 'rewards') {
      result.sort((a, b) => (b.months_awarded || 0) - (a.months_awarded || 0))
    } else if (sortBy === 'code') {
      result.sort((a, b) => a.referral_code.localeCompare(b.referral_code))
    }

    return result
  }, [referrals, searchQuery, statusFilter, campusFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage) || 1
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredReferrals.slice(start, start + itemsPerPage)
  }, [filteredReferrals, currentPage, itemsPerPage])

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Referral_Code', 'Referrer_Email', 'Referrer_Campus', 'Referred_Email', 'Status', 'Months_Awarded', 'Created_At']
    const rows = filteredReferrals.map(r => [
      r.id,
      r.referral_code,
      r.referrer?.email || '',
      r.referrer?.institutions?.abbreviation || '',
      r.referred_email,
      r.status,
      r.months_awarded || 0,
      r.created_at
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `unistudy-referrals-ledger-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Referrals ledger exported to CSV')
  }

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'rewarded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Crown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Rewarded (Pro)
          </span>
        )
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Converted
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            <AlertCircle className="w-3 h-3 text-zinc-500" />
            Expired
          </span>
        )
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Pending Invite
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            <span>Administration</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Growth & Virality Network</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-[var(--color-plum-500)]" />
            Student Referral Program & Ambassador Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Monitor peer-to-peer student invitations, campus ambassador code distribution, organic conversion funnels, and automated Pro tier reward fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchReward}
            disabled={isPending}
            className="h-9 gap-1.5 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
          >
            <Gift className="w-3.5 h-3.5 text-purple-600" />
            <span>Batch Reward Converted</span>
          </Button>

          <Button
            onClick={() => handleOpenProvision()}
            className="h-9 gap-1.5 bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Ambassador Code</span>
          </Button>
        </div>
      </div>

      {/* 2. Executive Growth Velocity Strip (5 KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invites</span>
            <Share2 className="w-4 h-4 text-[var(--color-plum-500)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Dispatched</span>
            <span>across network</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ambassador Codes</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.activeCodes}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>Unique promo links</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Converted Signups</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {stats.converted}
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
              {stats.conversionRate}% Rate
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>{stats.pending} pending registrations</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pro Months Awarded</span>
            <Crown className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{stats.totalMonthsAwarded} mo</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-purple-600 dark:text-purple-400 font-medium">{stats.rewarded} rewarded</span>
            <span>invites</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur border-border/70 hover:border-border transition-all col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Network Multiplier (K)</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats.total > 0 ? (stats.converted / (totalStudentsCount || 1) * 10).toFixed(2) : '1.14'}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Virality coefficient</span>
          </div>
        </Card>
      </div>

      {/* 3. Campus Ambassador Leaderboard & Growth Policy Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaderboard Card (2 Cols) */}
        <Card className="lg:col-span-2 border-border/70 overflow-hidden">
          <CardHeader className="py-3 px-5 bg-muted/40 border-b border-border/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <div>
                <CardTitle className="text-sm font-semibold">UPSA Faculty Ambassador & Peer Leaderboard</CardTitle>
                <CardDescription className="text-xs">
                  Top student advocates driving verified peer signups across UPSA faculties (FITCS, Accounting, Management, Law).
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono bg-background">
              Top 5 Performers
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {topReferrers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p>No ambassador referral conversions recorded yet.</p>
                <p className="text-[11px] mt-1 text-muted-foreground">
                  Click "Provision Ambassador Code" above to generate a promo link for campus representatives.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {topReferrers.map((item, idx) => (
                  <div key={item.email} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                          : idx === 1
                          ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground font-normal">({item.email})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {item.campus}
                          </span>
                          <span>&bull;</span>
                          <span>{item.totalInvites} invites issued</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {item.conversions} Converted
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.monthsEarned} Pro months earned
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 hidden sm:inline-flex"
                        onClick={() => handleOpenProvision(generateRandomCode(item.campus))}
                      >
                        <Plus className="w-3 h-3" /> Add Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth Policy & Anti-Fraud Guard Card (1 Col) */}
        <Card className="border-border/70 p-4 flex flex-col justify-between bg-gradient-to-br from-card via-background to-muted/20">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold tracking-tight text-foreground">Program Rules & Fraud Guard</h3>
            </div>

            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <div className="font-semibold text-foreground mb-0.5 flex items-center gap-1">
                  <Gift className="w-3 h-3 text-[var(--color-plum-500)]" />
                  Dual-Sided Referral Incentive
                </div>
                <p className="text-[11px] leading-relaxed">
                  Referrer receives <strong>+1 Month of Pro Tier</strong> on verified peer signup. Invitee receives <strong>25 Bonus AI slide explanation credits</strong>.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <div className="font-semibold text-foreground mb-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Anti-Fraud & Domain Verification
                </div>
                <p className="text-[11px] leading-relaxed">
                  Disposable and temporary email domains are rejected at registration. Self-referrals and IP-colliding signups are flagged for manual review.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <div className="font-semibold text-foreground mb-0.5 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-blue-500" />
                  Public Invite Link Format
                </div>
                <p className="text-[11px] font-mono text-foreground break-all">
                  https://unistudy.ai/signup?ref=CODE
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">Active</strong></span>
            <Button
              variant="link"
              className="h-auto p-0 text-[11px] text-[var(--color-plum-500)]"
              onClick={() => handleOpenProvision('CAMPUS-VIP')}
            >
              Provision Campus VIP &rarr;
            </Button>
          </div>
        </Card>
      </div>

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
              placeholder="Search by code, referrer email, referred student, or campus..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filters & Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={v => {
                setStatusFilter(v || 'all')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending Invite</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rewarded">Rewarded (Pro)</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Campus Filter */}
            {campusOptions.length > 0 && (
              <Select
                value={campusFilter}
                onValueChange={v => {
                  setCampusFilter(v || 'all')
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campusOptions.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort Filter */}
            <Select
              value={sortBy}
              onValueChange={v => setSortBy((v as any) || 'newest')}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="rewards">Most Rewards</SelectItem>
                <SelectItem value="code">Code A-Z</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
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

        {/* Selected Batch Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs bg-purple-500/5 -mx-4 -mb-4 p-3 rounded-b-lg">
            <span className="font-semibold text-foreground">
              {selectedIds.length} referrals selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                className="h-7 text-xs"
              >
                Deselect
              </Button>
              <Button
                size="sm"
                onClick={handleBatchReward}
                disabled={isPending}
                className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Gift className="w-3 h-3" /> Grant Pro Month to Selected
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 5. Referral Directory Table or Card View */}
      {viewMode === 'table' ? (
        <Card className="border-border/70 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={paginatedReferrals.length > 0 && selectedIds.length === paginatedReferrals.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Referral Code</th>
                  <th className="px-4 py-3">Advocate / Referrer</th>
                  <th className="px-4 py-3">Referred Student</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rewards</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <Share2 className="w-8 h-8 text-muted-foreground/30 mb-3" />
                        <h4 className="text-sm font-semibold text-foreground">No referral records found</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          {searchQuery || statusFilter !== 'all'
                            ? 'Try clearing active filters to see all referrals.'
                            : 'Generate your first ambassador code to kickstart campus virality.'}
                        </p>
                        <Button size="sm" onClick={() => handleOpenProvision()} className="gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Provision Ambassador Code</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedReferrals.map(item => (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        selectedIds.includes(item.id) ? 'bg-purple-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded border-border cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded border border-border">
                            {item.referral_code}
                          </span>
                          <button
                            onClick={() => handleCopyLink(item.referral_code)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy signup invite link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground text-xs leading-tight">
                          {item.referrer?.email || 'System / Direct Link'}
                        </div>
                        {item.referrer?.institutions?.abbreviation && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            <span>{item.referrer.institutions.abbreviation}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.referred_email}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {item.months_awarded || 0} mo
                          </span>
                          <button
                            onClick={() => handleGrantRewardMonth(item.id)}
                            className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                            title="Grant +1 month Pro reward"
                          >
                            +1 mo
                          </button>
                        </div>
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

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopyLink(item.referral_code)}
                            title="Copy link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors outline-none cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleCopyLink(item.referral_code)}>
                                <Copy className="w-4 h-4 mr-2 text-blue-500" />
                                Copy Invite Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGrantRewardMonth(item.id)}>
                                <Gift className="w-4 h-4 mr-2 text-purple-500" />
                                Grant +1 Pro Month
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'converted')}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                                Mark as Converted
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'rewarded')}>
                                <Crown className="w-4 h-4 mr-2 text-amber-500" />
                                Mark as Rewarded
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'pending')}>
                                <Clock className="w-4 h-4 mr-2 text-zinc-500" />
                                Reset to Pending
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Referral
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedReferrals.map(item => (
            <Card key={item.id} className="p-4 border border-border/70 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded border border-border">
                    {item.referral_code}
                  </span>
                  {renderStatusBadge(item.status)}
                </div>

                <div className="space-y-1.5 my-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Referred Student:</span>
                    <strong className="text-foreground">{item.referred_email}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Advocate / Referrer:</span>
                    <span className="text-foreground font-medium">{item.referrer?.email || 'Direct Invite'}</span>
                  </div>
                  {item.referrer?.institutions?.abbreviation && (
                    <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                      <Building2 className="w-3 h-3" />
                      <span>{item.referrer.institutions.abbreviation}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{item.months_awarded || 0} mo awarded</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleCopyLink(item.referral_code)}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    onClick={() => handleGrantRewardMonth(item.id)}
                  >
                    +1 Mo
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
          Showing {paginatedReferrals.length} of {filteredReferrals.length} referrals
          {filteredReferrals.length !== referrals.length && ` (filtered from ${referrals.length})`}
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

      {/* 6. Provision Ambassador Code Modal (Sheet) */}
      <Sheet open={provisionOpen} onOpenChange={setProvisionOpen}>
        <SheetContent className="sm:max-w-lg w-full flex flex-col justify-between overflow-y-auto">
          <div>
            <SheetHeader className="pb-4 border-b border-border">
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Provision Campus Ambassador Code
              </SheetTitle>
              <SheetDescription className="text-xs">
                Issue a dedicated promotional referral link for student reps, course reps, or academic society executives.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSaveProvision} className="space-y-4 py-5">
              {/* Referral Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ambassador Referral Code
                  </Label>
                  <button
                    type="button"
                    onClick={() => setProvCode(generateRandomCode())}
                    className="text-[11px] text-[var(--color-plum-500)] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <Input
                  id="code"
                  value={provCode}
                  onChange={e => setProvCode(e.target.value.toUpperCase())}
                  placeholder="e.g. UG-LEGON-2026"
                  className="font-mono text-sm uppercase"
                  required
                />
              </div>

              {/* Referrer Advocate Email */}
              <div className="space-y-1.5">
                <Label htmlFor="referrerEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Referrer Advocate Email (Optional)
                </Label>
                <Input
                  id="referrerEmail"
                  type="email"
                  value={provReferrerEmail}
                  onChange={e => setProvReferrerEmail(e.target.value)}
                  placeholder="student.advocate@st.ug.edu.gh"
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  If linked to an existing student profile, they will receive +1 month of Pro when peers register.
                </p>
              </div>

              {/* Target Invitee Email */}
              <div className="space-y-1.5">
                <Label htmlFor="referredEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Target Invitee / Peer Email
                </Label>
                <Input
                  id="referredEmail"
                  type="email"
                  value={provReferredEmail}
                  onChange={e => setProvReferredEmail(e.target.value)}
                  placeholder="prospective.student@knust.edu.gh"
                  className="text-sm"
                  required
                />
              </div>

              {/* Initial Status & Months Awarded */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Initial Status
                  </Label>
                  <Select
                    value={provStatus}
                    onValueChange={(v: any) => setProvStatus(v || 'pending')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Invite</SelectItem>
                      <SelectItem value="converted">Pre-Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="months" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reward Months
                  </Label>
                  <Input
                    id="months"
                    type="number"
                    min={0}
                    max={12}
                    value={provMonths}
                    onChange={e => setProvMonths(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Live Link Preview */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Shareable Signup URL</span>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(provCode)}
                    className="text-[11px] text-[var(--color-plum-500)] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground break-all">
                  https://unistudy.ai/signup?ref={provCode || 'CODE'}
                </div>
              </div>
            </form>
          </div>

          <SheetFooter className="pt-4 border-t border-border flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProvisionOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveProvision}
              disabled={isSubmitting || !provCode.trim() || !provReferredEmail.trim()}
              className="bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white gap-1.5 shadow-sm"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Provisioning...' : 'Provision Ambassador Code'}</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 7. Delete Referral Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold">Delete Referral Code?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete referral code <strong className="text-foreground">{deleteTarget?.referral_code}</strong> for {deleteTarget?.referred_email}? This action is irreversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Confirm Deletion'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

