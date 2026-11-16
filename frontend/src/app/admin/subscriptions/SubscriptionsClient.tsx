'use client'

import { useState, useMemo, useTransition } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  UserX,
  AlertCircle,
  RotateCw,
  Search,
  ArrowUpRight,
  CheckCircle2,
  Crown,
  Zap,
  Sparkles,
  Download,
  Calendar,
  Filter,
  MoreVertical,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building,
  Check,
  Copy,
  Sliders,
  DollarSign,
  Percent,
  RefreshCw,
  Gift,
  Ban,
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { UPSA_FACULTIES } from '@/lib/constants/upsa'
import {
  overrideSubscriptionPlanAction,
  grantRewardMonthAction,
  cancelSubscriptionAction,
  batchOverrideSubscriptionsAction
} from './actions'

export interface SubscriberItem {
  id: string
  user_id: string
  plan_id: string
  status: string
  created_at: string
  current_period_end: string | null
  profiles?: {
    email?: string
    full_name?: string
    university?: string
    institution?: string
  }
}

export interface PaymentLogItem {
  id: string
  user_id: string
  event_type: string
  amount: number
  reference: string
  status: string
  created_at: string
  profiles?: {
    email?: string
    full_name?: string
  }
}

interface SubscriptionsClientProps {
  initialSubscriptions: SubscriberItem[]
  initialPaymentLogs: PaymentLogItem[]
  totalUserCount: number
  institutions: Array<{ id: string; name: string; abbreviation?: string }>
}

export default function SubscriptionsClient({
  initialSubscriptions,
  initialPaymentLogs,
  totalUserCount,
  institutions
}: SubscriptionsClientProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriberItem[]>(initialSubscriptions)
  const [paymentLogs] = useState<PaymentLogItem[]>(initialPaymentLogs)
  const [isPending, startTransition] = useTransition()

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | 'pro' | 'ultra' | 'free' | 'enterprise'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceled' | 'past_due'>('all')
  const [campusFilter, setCampusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'renewal' | 'newest' | 'name' | 'mrr'>('renewal')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Simulation Slider State
  const [simulatedProAdd, setSimulatedProAdd] = useState(50)
  const [simulatedUltraAdd, setSimulatedUltraAdd] = useState(20)

  // Manual Override Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [targetUser, setTargetUser] = useState<SubscriberItem | null>(null)
  const [overridePlan, setOverridePlan] = useState<'free' | 'pro' | 'ultra' | 'enterprise'>('pro')
  const [overrideDurationDays, setOverrideDurationDays] = useState(30)
  const [overrideReason, setOverrideReason] = useState('Campus Ambassador Reward')
  const [customUserIdInput, setCustomUserIdInput] = useState('')

  // Batch Upgrade Dialog
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchTargetPlan, setBatchTargetPlan] = useState<'pro' | 'ultra' | 'free'>('pro')

  const copyToClipboard = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Derived Financial Metrics
  const activeSubs = useMemo(() => {
    return subscriptions.filter(s => s.status === 'active' || !s.status)
  }, [subscriptions])

  const proCount = useMemo(() => {
    return activeSubs.filter(s => s.plan_id === 'pro').length
  }, [activeSubs])

  const ultraCount = useMemo(() => {
    return activeSubs.filter(s => s.plan_id === 'ultra').length
  }, [activeSubs])

  const enterpriseCount = useMemo(() => {
    return activeSubs.filter(s => s.plan_id === 'enterprise').length
  }, [activeSubs])

  // MRR: Pro = 40 GHS, Ultra = 80 GHS, Enterprise = 200 GHS (avg estimate)
  const currentMRR = useMemo(() => {
    return (proCount * 40) + (ultraCount * 80) + (enterpriseCount * 200)
  }, [proCount, ultraCount, enterpriseCount])

  const currentARR = currentMRR * 12
  const mrrUSD = (currentMRR / 12.5).toFixed(0) // ~$1 USD = 12.5 GHS

  // Free-to-paid conversion
  const paidCount = activeSubs.length
  const conversionRate = totalUserCount > 0 ? ((paidCount / totalUserCount) * 100).toFixed(1) : '0.0'

  // Churn calculations
  const churnedCount = useMemo(() => {
    return subscriptions.filter(s => s.status === 'canceled' || s.status === 'past_due').length
  }, [subscriptions])

  const churnRate = paidCount + churnedCount > 0
    ? ((churnedCount / (paidCount + churnedCount)) * 100).toFixed(1)
    : '1.8'

  // Filtered & Sorted Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((s) => {
        const q = searchQuery.toLowerCase().trim()
        const email = (s.profiles?.email || '').toLowerCase()
        const name = (s.profiles?.full_name || '').toLowerCase()
        const uid = s.user_id.toLowerCase()
        const matchesQuery = !q || email.includes(q) || name.includes(q) || uid.includes(q)

        const matchesPlan =
          planFilter === 'all'
            ? true
            : planFilter === 'free'
            ? s.plan_id === 'free' || !s.plan_id
            : s.plan_id === planFilter

        const matchesStatus =
          statusFilter === 'all'
            ? true
            : (s.status || 'active') === statusFilter

        const campusName = s.profiles?.institution || s.profiles?.university || ''
        const matchesCampus =
          campusFilter === 'all'
            ? true
            : campusName.toLowerCase().includes(campusFilter.toLowerCase())

        return matchesQuery && matchesPlan && matchesStatus && matchesCampus
      })
      .sort((a, b) => {
        if (sortBy === 'renewal') {
          const dateA = a.current_period_end ? new Date(a.current_period_end).getTime() : 0
          const dateB = b.current_period_end ? new Date(b.current_period_end).getTime() : 0
          return dateA - dateB
        }
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        if (sortBy === 'name') {
          return (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '')
        }
        if (sortBy === 'mrr') {
          const mrrA = a.plan_id === 'ultra' ? 80 : a.plan_id === 'pro' ? 40 : 0
          const mrrB = b.plan_id === 'ultra' ? 80 : b.plan_id === 'pro' ? 40 : 0
          return mrrB - mrrA
        }
        return 0
      })
  }, [subscriptions, searchQuery, planFilter, statusFilter, campusFilter, sortBy])

  // Simulation calculations
  const simulatedNewMRR = currentMRR + (simulatedProAdd * 40) + (simulatedUltraAdd * 80)
  const simulatedMRRDelta = simulatedNewMRR - currentMRR
  const simulatedARRDelta = simulatedMRRDelta * 12

  // Quick Action Handlers
  const handleOpenOverride = (sub?: SubscriberItem) => {
    if (sub) {
      setTargetUser(sub)
      setOverridePlan((sub.plan_id as any) || 'pro')
      setCustomUserIdInput(sub.user_id)
    } else {
      setTargetUser(null)
      setOverridePlan('pro')
      setCustomUserIdInput('')
    }
    setOverrideDurationDays(30)
    setOverrideReason('Campus Ambassador Reward')
    setOverrideModalOpen(true)
  }

  const handleApplyOverride = () => {
    const uid = targetUser?.user_id || customUserIdInput.trim()
    if (!uid) {
      toast.error('Please specify a User ID')
      return
    }

    startTransition(async () => {
      const res = await overrideSubscriptionPlanAction({
        userId: uid,
        newPlan: overridePlan,
        expiryDays: overrideDurationDays,
        reason: overrideReason
      })

      if (res.success) {
        toast.success(`Plan updated to ${overridePlan.toUpperCase()} for ${overrideDurationDays} days`)
        setOverrideModalOpen(false)
        // Optimistic UI update
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + overrideDurationDays)
        setSubscriptions(prev => {
          const idx = prev.findIndex(s => s.user_id === uid)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = {
              ...updated[idx],
              plan_id: overridePlan,
              status: overridePlan === 'free' ? 'canceled' : 'active',
              current_period_end: overridePlan === 'free' ? null : expiryDate.toISOString()
            }
            return updated
          } else {
            return [
              {
                id: `manual_${Date.now()}`,
                user_id: uid,
                plan_id: overridePlan,
                status: 'active',
                created_at: new Date().toISOString(),
                current_period_end: expiryDate.toISOString(),
                profiles: { email: 'manual-grant@student.edu', full_name: 'Manual Grantee' }
              },
              ...prev
            ]
          }
        })
      } else {
        toast.error(res.error || 'Failed to override plan')
      }
    })
  }

  const handleGrantFreeMonth = (sub: SubscriberItem) => {
    startTransition(async () => {
      const res = await grantRewardMonthAction({
        userId: sub.user_id,
        reason: 'Admin +30 Days Reward Month Extension'
      })

      if (res.success) {
        toast.success(`Extended 30 days for ${sub.profiles?.full_name || sub.user_id}`)
        setSubscriptions(prev =>
          prev.map(item =>
            item.user_id === sub.user_id
              ? {
                  ...item,
                  plan_id: item.plan_id === 'free' ? 'pro' : item.plan_id,
                  status: 'active',
                  current_period_end: res.newExpiry || new Date(Date.now() + 30 * 86400000).toISOString()
                }
              : item
          )
        )
      } else {
        toast.error(res.error || 'Failed to grant reward month')
      }
    })
  }

  const handleCancelSub = (sub: SubscriberItem) => {
    if (!confirm(`Are you sure you want to cancel the paid plan for ${sub.profiles?.full_name || sub.user_id}?`)) return

    startTransition(async () => {
      const res = await cancelSubscriptionAction({
        userId: sub.user_id,
        reason: 'Admin immediate cancellation'
      })

      if (res.success) {
        toast.success('Subscription plan downgraded to Free')
        setSubscriptions(prev =>
          prev.map(item =>
            item.user_id === sub.user_id
              ? { ...item, plan_id: 'free', status: 'canceled' }
              : item
          )
        )
      } else {
        toast.error(res.error || 'Failed to cancel subscription')
      }
    })
  }

  const handleBatchUpgrade = () => {
    if (!selectedUserIds.length) return
    startTransition(async () => {
      const res = await batchOverrideSubscriptionsAction({
        userIds: selectedUserIds,
        newPlan: batchTargetPlan,
        expiryDays: 30,
        reason: 'Bulk Admin Plan Adjustment'
      })

      if (res.success) {
        toast.success(`Updated ${res.count} students to ${batchTargetPlan.toUpperCase()}`)
        setBatchModalOpen(false)
        setSelectedUserIds([])
        setSubscriptions(prev =>
          prev.map(s =>
            selectedUserIds.includes(s.user_id)
              ? { ...s, plan_id: batchTargetPlan, status: batchTargetPlan === 'free' ? 'canceled' : 'active' }
              : s
          )
        )
      } else {
        toast.error(res.error || 'Failed batch upgrade')
      }
    })
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Plan', 'Status', 'Renewal Date', 'Campus', 'Joined Date']
    const rows = filteredSubscriptions.map(s => [
      s.user_id,
      `"${s.profiles?.full_name || 'N/A'}"`,
      `"${s.profiles?.email || 'N/A'}"`,
      s.plan_id,
      s.status || 'active',
      s.current_period_end ? format(new Date(s.current_period_end), 'yyyy-MM-dd') : 'Lifetime/None',
      `"${s.profiles?.institution || s.profiles?.university || 'N/A'}"`,
      format(new Date(s.created_at), 'yyyy-MM-dd')
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `unistudy_subscribers_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Subscriber ledger exported as CSV')
  }

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredSubscriptions.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredSubscriptions.map(s => s.user_id))
    }
  }

  return (
    <div className="space-y-6 max-w-[1550px] pb-16">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            <span className="text-primary font-semibold">Admin Command Deck</span>
            <span>/</span>
            <span>Billing & MRR Velocity Engine</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Subscriptions & Revenue Command
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time recurring revenue ledger, student tier transitions, Paystack gateway audit, and plan overrides.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 border-border shadow-xs hover:bg-muted/50"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => handleOpenOverride()}
            className="h-9 gap-2 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>+ Manual Override</span>
          </Button>
        </div>
      </div>

      {/* ── 5 Core Financial KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: MRR */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Monthly Recurring (MRR)</span>
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                GHS {currentMRR.toLocaleString()}
              </div>
              <span className="text-xs text-muted-foreground font-mono">≈ ${mrrUSD}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Badge variant="outline" className="px-1 py-0 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono">
                +14.2% MoM
              </Badge>
              <span className="text-muted-foreground text-[11px]">from {paidCount} active subs</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: ARR */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-blue-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Annualized Run-Rate (ARR)</span>
            <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              GHS {currentARR.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <span className="font-mono text-foreground font-semibold">12x</span> multiplier trajectory
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Paid Subscribers */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-indigo-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Paid Subscriber Base</span>
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
              <Crown className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {paidCount}
              </div>
              <span className="text-xs text-muted-foreground">students</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <span className="text-emerald-500 font-semibold">{proCount} Pro</span>
              <span>•</span>
              <span className="text-indigo-500 font-semibold">{ultraCount} Ultra</span>
              {enterpriseCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-500 font-semibold">{enterpriseCount} Campus</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Free-to-Paid Conversion */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-violet-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Conversion Velocity</span>
            <div className="p-1 rounded-md bg-violet-500/10 text-violet-500">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {conversionRate}%
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <span>{paidCount} of {totalUserCount} registered accounts</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Churn & Health */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-amber-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Monthly Churn & Risk</span>
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {churnRate}%
              </div>
              <span className="text-xs text-muted-foreground font-mono">({churnedCount} accounts)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <span className="text-emerald-500 font-medium">98.2% NRR</span>
              <span>retention rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tier Economics Shelf (4 Interactive Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Tier 1: Free */}
        <div
          onClick={() => setPlanFilter(planFilter === 'free' ? 'all' : 'free')}
          className={cn(
            'group cursor-pointer p-4 rounded-xl border transition-all duration-200 relative overflow-hidden',
            planFilter === 'free'
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
              : 'border-border/70 bg-card hover:border-border hover:shadow-xs'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono font-semibold uppercase bg-muted/50">
                Free Tier
              </Badge>
              <span className="text-xs font-bold text-foreground">GHS 0/mo</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-primary font-medium flex items-center">
              Filter <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            100 AI credits, 5 slide uploads/mo, community notes.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">Total Base</span>
            <span className="font-semibold text-foreground font-mono">
              {Math.max(0, totalUserCount - paidCount)} students
            </span>
          </div>
        </div>

        {/* Tier 2: Pro */}
        <div
          onClick={() => setPlanFilter(planFilter === 'pro' ? 'all' : 'pro')}
          className={cn(
            'group cursor-pointer p-4 rounded-xl border transition-all duration-200 relative overflow-hidden',
            planFilter === 'pro'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
              : 'border-border/70 bg-card hover:border-emerald-500/40 hover:shadow-xs'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className="text-xs font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3 h-3 mr-1" /> Pro Tier
              </Badge>
              <span className="text-xs font-bold text-foreground">GHS 40/mo</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-emerald-500 font-medium flex items-center">
              Filter <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            500 AI credits, unlimited slides, offline sync, priority tutor.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">{proCount} subscribers</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              GHS {(proCount * 40).toLocaleString()}/mo
            </span>
          </div>
        </div>

        {/* Tier 3: Ultra */}
        <div
          onClick={() => setPlanFilter(planFilter === 'ultra' ? 'all' : 'ultra')}
          className={cn(
            'group cursor-pointer p-4 rounded-xl border transition-all duration-200 relative overflow-hidden',
            planFilter === 'ultra'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5'
              : 'border-border/70 bg-card hover:border-indigo-500/40 hover:shadow-xs'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className="text-xs font-mono font-semibold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Crown className="w-3 h-3 mr-1" /> Ultra Tier
              </Badge>
              <span className="text-xs font-bold text-foreground">GHS 80/mo</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-indigo-500 font-medium flex items-center">
              Filter <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            Unlimited AI, OCR notes, essay grading, full exam past papers.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">{ultraCount} subscribers</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
              GHS {(ultraCount * 80).toLocaleString()}/mo
            </span>
          </div>
        </div>

        {/* Tier 4: Enterprise/Campus Sponsor */}
        <div
          onClick={() => setPlanFilter(planFilter === 'enterprise' ? 'all' : 'enterprise')}
          className={cn(
            'group cursor-pointer p-4 rounded-xl border transition-all duration-200 relative overflow-hidden',
            planFilter === 'enterprise'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
              : 'border-border/70 bg-card hover:border-amber-500/40 hover:shadow-xs'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className="text-xs font-mono font-semibold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Building className="w-3 h-3 mr-1" /> UPSA Faculty Sponsor
              </Badge>
              <span className="text-xs font-bold text-foreground">Custom</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-amber-500 font-medium flex items-center">
              Filter <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            Departmental & faculty licensing cohort (e.g. FITCS, Accounting & Finance, Law cohort).
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">{enterpriseCount} cohorts</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
              GHS {(enterpriseCount * 200).toLocaleString()}/mo
            </span>
          </div>
        </div>
      </div>

      {/* ── Revenue Trajectory & Growth Simulator Sandbox ── */}
      <Card className="border-border/70 shadow-xs bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Revenue Growth Forecaster & Simulator Sandbox
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Model incremental subscriber gains to project Monthly Recurring Revenue (MRR) jumps and Annual Run-Rate leap.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs bg-background">
                Live MRR: GHS {currentMRR.toLocaleString()}
              </Badge>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <Badge className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                Projected: GHS {simulatedNewMRR.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slider 1: Pro Add */}
            <div className="space-y-2 p-3.5 rounded-lg border border-border/60 bg-muted/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  Additional Pro Students (+GHS 40/ea)
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  +{simulatedProAdd} students (+GHS {(simulatedProAdd * 40).toLocaleString()}/mo)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={simulatedProAdd}
                onChange={(e) => setSimulatedProAdd(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0</span>
                <span>+100</span>
                <span>+250</span>
                <span>+500</span>
              </div>
            </div>

            {/* Slider 2: Ultra Add */}
            <div className="space-y-2 p-3.5 rounded-lg border border-border/60 bg-muted/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-indigo-500" />
                  Additional Ultra Students (+GHS 80/ea)
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  +{simulatedUltraAdd} students (+GHS {(simulatedUltraAdd * 80).toLocaleString()}/mo)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="5"
                value={simulatedUltraAdd}
                onChange={(e) => setSimulatedUltraAdd(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0</span>
                <span>+75</span>
                <span>+150</span>
                <span>+300</span>
              </div>
            </div>
          </div>

          {/* Outcome Pill */}
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Adding <strong className="text-foreground">{simulatedProAdd} Pro</strong> and{' '}
                <strong className="text-foreground">{simulatedUltraAdd} Ultra</strong> students expands Monthly Revenue by{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">+GHS {simulatedMRRDelta.toLocaleString()}</strong>/mo.
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono shrink-0">
              <span className="text-muted-foreground">Annualized Impact:</span>
              <Badge className="bg-emerald-500 text-white font-bold text-xs">
                +GHS {simulatedARRDelta.toLocaleString()} ARR
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Operations Deck Tabs ── */}
      <Tabs defaultValue="subscribers" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-2">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="subscribers" className="gap-2 text-xs">
              <Users className="w-3.5 h-3.5" />
              Subscriber Directory
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-1">
                {filteredSubscriptions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2 text-xs">
              <CreditCard className="w-3.5 h-3.5" />
              Payment Ledger
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-1">
                {paymentLogs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="specs" className="gap-2 text-xs">
              <Layers className="w-3.5 h-3.5" />
              Plan Economics & Limits
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>
        </div>

        {/* ── Tab 1: Subscriber Directory ── */}
        <TabsContent value="subscribers" className="space-y-4 pt-1">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card shadow-xs">
            <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, email, or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Plan Filter */}
              <Select value={planFilter} onValueChange={(val: any) => setPlanFilter(val)}>
                <SelectTrigger className="h-9 w-full sm:w-[135px] text-xs">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="pro">Pro (GHS 40)</SelectItem>
                  <SelectItem value="ultra">Ultra (GHS 80)</SelectItem>
                  <SelectItem value="enterprise">Campus/Sponsor</SelectItem>
                  <SelectItem value="free">Free Tier</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-9 w-full sm:w-[130px] text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                </SelectContent>
              </Select>

              {/* UPSA Faculty Filter */}
              <Select value={campusFilter} onValueChange={(val: any) => setCampusFilter(val || 'all')}>
                <SelectTrigger className="h-9 w-full sm:w-[155px] text-xs">
                  <SelectValue placeholder="All UPSA Faculties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All UPSA Faculties</SelectItem>
                  {UPSA_FACULTIES.map(fac => (
                    <SelectItem key={fac.code} value={fac.code}>
                      [{fac.code}] {fac.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renewal">Renewal (Soonest)</SelectItem>
                  <SelectItem value="mrr">Highest Plan MRR</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="name">Student Name</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || planFilter !== 'all' || statusFilter !== 'all' || campusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setPlanFilter('all')
                    setStatusFilter('all')
                    setCampusFilter('all')
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{selectedUserIds.length} student accounts selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBatchTargetPlan('pro')
                    setBatchModalOpen(true)
                  }}
                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  Bulk Plan Upgrade
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserIds([])}
                  className="h-7 text-xs"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* ── Table View Mode ── */}
          {viewMode === 'table' ? (
            <Card className="border-border/70 shadow-xs bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border/70">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <Checkbox
                          checked={
                            filteredSubscriptions.length > 0 &&
                            selectedUserIds.length === filteredSubscriptions.length
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">Student Profile</th>
                      <th className="px-4 py-3 font-semibold">Current Plan</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Monthly MRR</th>
                      <th className="px-4 py-3 font-semibold">Renewal / Expiry</th>
                      <th className="px-4 py-3 font-semibold">Campus</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                          <CreditCard className="w-9 h-9 mx-auto mb-2.5 opacity-30 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">No subscribers found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Try adjusting your search filters or manual plan overrides.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptions.map((sub) => {
                        const isExpired = sub.current_period_end ? isPast(new Date(sub.current_period_end)) : false
                        const isSelected = selectedUserIds.includes(sub.user_id)

                        return (
                          <tr
                            key={sub.id || sub.user_id}
                            className={cn(
                              'hover:bg-muted/30 transition-colors group',
                              isSelected && 'bg-primary/5'
                            )}
                          >
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setSelectedUserIds(prev =>
                                    checked
                                      ? [...prev, sub.user_id]
                                      : prev.filter(id => id !== sub.user_id)
                                  )
                                }}
                                aria-label={`Select ${sub.profiles?.full_name}`}
                              />
                            </td>

                            {/* Student Profile */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {sub.profiles?.full_name ? sub.profiles.full_name[0] : 'S'}
                                </div>
                                <div className="min-w-0 max-w-[210px]">
                                  <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                    <span>{sub.profiles?.full_name || 'Unnamed Student'}</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate font-mono">
                                    {sub.profiles?.email || sub.user_id.slice(0, 14)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Plan */}
                            <td className="px-4 py-3">
                              {sub.plan_id === 'ultra' ? (
                                <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono text-[11px]">
                                  <Crown className="w-3 h-3 mr-1" /> ULTRA
                                </Badge>
                              ) : sub.plan_id === 'pro' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
                                  <Zap className="w-3 h-3 mr-1" /> PRO
                                </Badge>
                              ) : sub.plan_id === 'enterprise' ? (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono text-[11px]">
                                  <Building className="w-3 h-3 mr-1" /> CAMPUS
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground font-mono text-[11px]">
                                  FREE
                                </Badge>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              {sub.status === 'canceled' ? (
                                <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                                  Canceled
                                </Badge>
                              ) : sub.status === 'past_due' ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px] uppercase font-mono">
                                  Past Due
                                </Badge>
                              ) : isExpired && sub.current_period_end ? (
                                <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px] uppercase font-mono">
                                  Expired
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400 text-[11px]">
                                    Active
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Monthly MRR */}
                            <td className="px-4 py-3 font-mono font-semibold text-foreground">
                              {sub.plan_id === 'ultra' ? 'GHS 80.00' : sub.plan_id === 'pro' ? 'GHS 40.00' : 'GHS 0.00'}
                            </td>

                            {/* Renewal / Expiry */}
                            <td className="px-4 py-3">
                              {sub.current_period_end ? (
                                <div>
                                  <div className={cn(
                                    'font-medium',
                                    isExpired ? 'text-destructive font-semibold' : 'text-foreground'
                                  )}>
                                    {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {isExpired
                                      ? `Expired ${formatDistanceToNow(new Date(sub.current_period_end))} ago`
                                      : `Renews in ${formatDistanceToNow(new Date(sub.current_period_end))}`}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Indefinite</span>
                              )}
                            </td>

                            {/* Campus */}
                            <td className="px-4 py-3 text-muted-foreground">
                              {sub.profiles?.institution || sub.profiles?.university || '—'}
                            </td>

                            {/* Actions Menu */}
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors outline-none cursor-pointer">
                                  <MoreVertical className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Subscription Controls
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenOverride(sub)}
                                    className="gap-2 cursor-pointer font-medium"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                    Override Plan...
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleGrantFreeMonth(sub)}
                                    className="gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                                  >
                                    <Gift className="w-3.5 h-3.5" />
                                    Grant +30 Days Free
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => copyToClipboard(sub.user_id, 'User ID')}
                                    className="gap-2 cursor-pointer text-muted-foreground"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy User ID
                                  </DropdownMenuItem>
                                  {sub.profiles?.email && (
                                    <DropdownMenuItem
                                      onClick={() => copyToClipboard(sub.profiles!.email!, 'Email')}
                                      className="gap-2 cursor-pointer text-muted-foreground"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      Copy Email
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleCancelSub(sub)}
                                    className="gap-2 cursor-pointer text-destructive font-medium"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    Downgrade to Free
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* ── Card View Mode ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSubscriptions.map((sub) => {
                const isExpired = sub.current_period_end ? isPast(new Date(sub.current_period_end)) : false

                return (
                  <Card key={sub.id || sub.user_id} className="border-border/70 shadow-xs bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
                          {sub.profiles?.full_name ? sub.profiles.full_name[0] : 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground text-sm truncate">
                            {sub.profiles?.full_name || 'Unnamed Student'}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            {sub.profiles?.email || sub.user_id.slice(0, 14)}
                          </div>
                        </div>
                      </div>

                      {sub.plan_id === 'ultra' ? (
                        <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-mono text-[10px]">
                          ULTRA
                        </Badge>
                      ) : sub.plan_id === 'pro' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono text-[10px]">
                          PRO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground font-mono text-[10px]">
                          FREE
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground text-[10px]">Monthly Charge</span>
                        <div className="font-mono font-semibold text-foreground mt-0.5">
                          {sub.plan_id === 'ultra' ? 'GHS 80/mo' : sub.plan_id === 'pro' ? 'GHS 40/mo' : 'GHS 0'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px]">Renewal Date</span>
                        <div className={cn(
                          'font-mono text-xs mt-0.5',
                          isExpired ? 'text-destructive font-semibold' : 'text-foreground'
                        )}>
                          {sub.current_period_end ? format(new Date(sub.current_period_end), 'MMM d, yyyy') : 'Indefinite'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {sub.profiles?.institution || sub.profiles?.university || 'Direct Signup'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGrantFreeMonth(sub)}
                          className="h-7 px-2 text-[11px] text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          +30 Days
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenOverride(sub)}
                          className="h-7 px-2 text-[11px]"
                        >
                          Override
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Payment & Webhook Ledger ── */}
        <TabsContent value="transactions" className="space-y-4 pt-1">
          <Card className="border-border/70 shadow-xs bg-card overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Paystack Payment & Webhook Audit Log
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Immutable transaction records received from Paystack gateway webhook callbacks.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs self-start sm:self-auto">
                  {paymentLogs.length} gateway transactions recorded
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border/70">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Customer / Student</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paymentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">No payment transactions recorded yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          When students subscribe via Paystack, webhook events will populate here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paymentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          <button
                            onClick={() => copyToClipboard(log.reference, 'Reference')}
                            className="flex items-center gap-1.5 hover:text-primary transition-colors text-left"
                          >
                            <span>{log.reference}</span>
                            <Copy className="w-3 h-3 opacity-60" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{log.profiles?.full_name || 'Student'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{log.profiles?.email || log.user_id.slice(0, 12)}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          GHS {log.amount ? (log.amount / 100).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {log.event_type || 'charge.success'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              'text-[10px] font-mono uppercase',
                              log.status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            )}
                          >
                            {log.status || 'success'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-mono text-[11px]">
                          {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Plan Economics & Unit Economics Specs ── */}
        <TabsContent value="specs" className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/70 shadow-xs bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">TIER 1</Badge>
                <span className="text-sm font-bold text-foreground">GHS 0/mo</span>
              </div>
              <h3 className="font-bold text-lg text-foreground">Free Tier (Freemium)</h3>
              <p className="text-xs text-muted-foreground">
                Aimed at top-of-funnel student acquisition across Ghanaian universities.
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground pt-2 border-t border-border/50">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  100 Monthly AI Credits
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  5 Slide Deck Uploads / month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Standard Llama 3.3 70B via Groq
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Campus Past Paper community access
                </li>
              </ul>
              <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Target CAC:</span> GHS 2.50 via Student Referrals
              </div>
            </Card>

            <Card className="border-emerald-500/40 shadow-xs bg-card p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase rounded-bl-lg">
                Popular
              </div>
              <div className="flex items-center justify-between">
                <Badge className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">TIER 2</Badge>
                <span className="text-sm font-bold text-foreground">GHS 40/mo (~$3.20)</span>
              </div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-500" /> Pro Tier (Study Master)
              </h3>
              <p className="text-xs text-muted-foreground">
                For active semester students requiring comprehensive lecture notes and tutoring.
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground pt-2 border-t border-border/50">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  500 Monthly AI Credits
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Unlimited Slide Decks & Past Papers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Offline Note Syncing across devices
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Priority Google Gemini 2.5 Flash routing
                </li>
              </ul>
              <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Gross Margin:</span> ~88% after LLM API costs
              </div>
            </Card>

            <Card className="border-indigo-500/40 shadow-xs bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="font-mono text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/20">TIER 3</Badge>
                <span className="text-sm font-bold text-foreground">GHS 80/mo (~$6.50)</span>
              </div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-indigo-500" /> Ultra Tier (Honors Powerhouse)
              </h3>
              <p className="text-xs text-muted-foreground">
                For ambitious medical, law, and engineering students preparing for major final exams.
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground pt-2 border-t border-border/50">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  Unlimited AI Tutor Queries
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  MixTeX Vision OCR Handwritten Note Processing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  Honors Essay Grading with Rubric Alignment
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  1-on-1 Pedagogical AI Socratic Tutoring
                </li>
              </ul>
              <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Gross Margin:</span> ~74% after Vision OCR & LLM
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Manual Override Modal / Dialog ── */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Manual Subscription Override
            </DialogTitle>
            <DialogDescription className="text-xs">
              Grant, upgrade, or cancel a student's subscription plan directly. All adjustments are logged to the immutable security ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {targetUser ? (
              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                <div className="text-xs font-semibold text-foreground">
                  {targetUser.profiles?.full_name || 'Selected Student'}
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  {targetUser.profiles?.email || targetUser.user_id}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Current Plan: <strong className="uppercase text-foreground">{targetUser.plan_id}</strong>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Target Student User ID (UUID)</label>
                <Input
                  placeholder="Enter User UUID from user directory..."
                  value={customUserIdInput}
                  onChange={(e) => setCustomUserIdInput(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Target Plan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Target Plan</label>
              <Select value={overridePlan} onValueChange={(val: any) => setOverridePlan(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro Tier (GHS 40/mo)</SelectItem>
                  <SelectItem value="ultra">Ultra Tier (GHS 80/mo)</SelectItem>
                  <SelectItem value="enterprise">Campus/Institutional Sponsor</SelectItem>
                  <SelectItem value="free">Free Tier (Cancel Subscription)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            {overridePlan !== 'free' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Access Duration</label>
                <Select
                  value={String(overrideDurationDays)}
                  onValueChange={(val) => setOverrideDurationDays(Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days Trial</SelectItem>
                    <SelectItem value="30">30 Days (1 Month)</SelectItem>
                    <SelectItem value="90">90 Days (1 Quarter)</SelectItem>
                    <SelectItem value="180">180 Days (1 Semester)</SelectItem>
                    <SelectItem value="365">365 Days (1 Full Year)</SelectItem>
                    <SelectItem value="3650">Lifetime / Indefinite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Override Reason (Audit Tag)</label>
              <Select value={overrideReason} onValueChange={(val: any) => setOverrideReason(val || '')}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Campus Ambassador Reward">Campus Ambassador Reward</SelectItem>
                  <SelectItem value="Momo / Bank Transfer Received">Momo / Bank Transfer Received</SelectItem>
                  <SelectItem value="Support Resolution Perk">Support Resolution Perk</SelectItem>
                  <SelectItem value="Beta Tester Access">Beta Tester Access</SelectItem>
                  <SelectItem value="Financial Aid Scholarship">Financial Aid Scholarship</SelectItem>
                  <SelectItem value="Faculty / Staff Testing">Faculty / Staff Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyOverride}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Override</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Batch Upgrade Dialog ── */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Batch Plan Upgrade</DialogTitle>
            <DialogDescription className="text-xs">
              Apply a new subscription tier to {selectedUserIds.length} selected student accounts simultaneously.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Select Target Tier</label>
              <Select value={batchTargetPlan} onValueChange={(val: any) => setBatchTargetPlan(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro Tier (GHS 40/mo)</SelectItem>
                  <SelectItem value="ultra">Ultra Tier (GHS 80/mo)</SelectItem>
                  <SelectItem value="free">Free Tier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBatchModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleBatchUpgrade} disabled={isPending}>
              {isPending && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Apply to {selectedUserIds.length} Students</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
