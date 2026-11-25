'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Search,
  ArrowUpRight,
  Loader2,
  Shield,
  KeyRound,
  Trash2,
  Ban,
  UserCheck,
  MessageSquare,
  BookOpen,
  Activity,
  Zap,
  GraduationCap,
  Users,
  Download,
  RefreshCw,
  MoreVertical,
  Copy,
  Check,
  Filter,
  CreditCard,
  Crown,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { CopyableId } from '@/components/ui/copyable-id';
import { apiFetch } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn, formatAcademicLevel } from '@/lib/utils';
import { UPSA_FACULTIES, UPSA_INSTITUTION } from '@/lib/constants/upsa';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    admins: 0,
    suspended: 0,
    paid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cohort & Filtering Controls
  const [cohortTab, setCohortTab] = useState<'all' | 'students' | 'admins' | 'paid' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'plan_desc'>('newest');

  // Checkbox Selection & Batch Mode
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // User Profile Drawer (Sheet)
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const computeStats = (userList: any[]) => ({
    total: userList.length,
    students: userList.filter((u: any) => u.role === 'student' || !u.role).length,
    admins: userList.filter((u: any) => u.role === 'admin').length,
    suspended: userList.filter((u: any) => u.role === 'suspended').length,
    paid: userList.filter((u: any) => {
      const sub = Array.isArray(u.subscriptions) ? u.subscriptions.find((s: any) => s.status === 'active') : null;
      return (sub && sub.plan_id !== 'free' && sub.plan !== 'free') || (u.plan && u.plan !== 'free');
    }).length,
  });

  const fetchUsers = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await apiFetch('/admin/users');
      const userList = Array.isArray(res) ? res : (res.users || []);
      setUsers(userList);

      if (res.stats) {
        setStats(res.stats);
      } else {
        setStats(computeStats(userList));
      }
    } catch (err: any) {
      console.warn("Backend /admin/users fetch failed, falling back to direct Supabase query:", err);
      try {
        const supabase = createClient();
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*, institutions(id, name, abbreviation)')
          .order('created_at', { ascending: false });

        if (!error && profiles) {
          setUsers(profiles);
          setStats(computeStats(profiles));
        } else {
          const { data: rawProfiles, error: rawError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (rawError) throw rawError;
          setUsers(rawProfiles || []);
          setStats(computeStats(rawProfiles || []));
        }
      } catch (fallbackErr: any) {
        console.error("Failed to fetch admin users from both backend and Supabase:", fallbackErr);
        toast.error("Failed to load users. Please check network connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const details = await apiFetch(`/admin/users/${userId}/details`);
      setUserDetails(details);
    } catch (err) {
      toast.error("Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenUser = (user: any) => {
    setSelectedUser(user);
    setUserDetails(null);
    fetchUserDetails(user.id);
  };

  const handleCopy = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      toast.success(`User role updated to ${newRole}`);
      await fetchUsers();
      if (selectedUser?.id === userId) setSelectedUser((prev: any) => ({ ...prev, role: newRole }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePlan = async (userId: string, newPlan: string) => {
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${userId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: newPlan })
      });
      toast.success(`User plan updated to ${newPlan}`);
      await fetchUsers();
      if (selectedUser?.id === userId) setSelectedUser((prev: any) => ({ ...prev, plan: newPlan }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update plan');
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setUpdating(true);
    try {
      const res = await apiFetch(`/admin/users/${userId}/reset-password`, { method: 'POST' });
      if (res.recoveryLink) {
        navigator.clipboard.writeText(res.recoveryLink);
        toast.success('Recovery link copied to clipboard!');
      } else {
        toast.success('Password recovery instruction triggered');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate reset link');
    } finally {
      setUpdating(false);
    }
  };

  const executeDeleteUser = async (userId: string) => {
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      toast.success('User account permanently deleted');
      setSelectedUser(null);
      setConfirmDialog(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Permanently delete user account?',
      description: 'This permanently removes the user account, enrolled course records, and authentication credentials. This action cannot be undone.',
      confirmLabel: 'Delete Account',
      onConfirm: () => executeDeleteUser(userId),
    });
  };

  // Batch Handlers
  const executeBatchRole = async (role: 'student' | 'admin' | 'suspended') => {
    setBatchActionLoading(true);
    try {
      await apiFetch('/admin/users/batch-role', {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedUserIds, role })
      });
      toast.success(`Updated role to ${role} for ${selectedUserIds.length} users`);
      setSelectedUserIds([]);
      setConfirmDialog(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Batch role update failed');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchRole = async (role: 'student' | 'admin' | 'suspended') => {
    if (selectedUserIds.length === 0) return;
    if (role === 'suspended') {
      setConfirmDialog({
        open: true,
        title: `Suspend ${selectedUserIds.length} selected accounts?`,
        description: 'Suspended accounts lose access to student dashboards and AI endpoints immediately until unsuspended.',
        confirmLabel: 'Suspend Accounts',
        onConfirm: () => executeBatchRole('suspended'),
      });
      return;
    }
    await executeBatchRole(role);
  };

  const handleBatchPlan = async (plan: 'free' | 'pro' | 'ultra') => {
    if (selectedUserIds.length === 0) return;
    setBatchActionLoading(true);
    try {
      await apiFetch('/admin/users/batch-plan', {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedUserIds, plan })
      });
      toast.success(`Updated plan to ${plan} for ${selectedUserIds.length} users`);
      setSelectedUserIds([]);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Batch plan update failed');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Extract unique institutions for filter dropdown
  const uniqueInstitutions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const name = u.institutions?.name || u.university;
      if (name && name !== 'Not specified' && !/^[0-9a-fA-F-]{36}$/.test(name)) {
        map.set(name, u.institutions?.abbreviation ? `${name} (${u.institutions.abbreviation})` : name);
      }
    });
    return Array.from(map.entries());
  }, [users]);

  // Filtered & Sorted Users
  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter((u) => {
      // Cohort Tab Filter
      if (cohortTab === 'students' && u.role !== 'student' && u.role) return false;
      if (cohortTab === 'admins' && u.role !== 'admin') return false;
      if (cohortTab === 'suspended' && u.role !== 'suspended') return false;
      if (cohortTab === 'paid') {
        const activeSub = Array.isArray(u.subscriptions) ? u.subscriptions.find((s: any) => s.status === 'active') : null;
        const currentPlan = activeSub ? activeSub.plan_id : (u.plan || 'free');
        if (currentPlan === 'free') return false;
      }

      // Search Query
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchesName = (u.full_name || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesId = (u.id || '').toLowerCase().includes(q);
        const matchesUni = (u.institutions?.name || u.university || '').toLowerCase().includes(q);
        const matchesDegree = (u.degree_programme || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId && !matchesUni && !matchesDegree) return false;
      }

      // UPSA Faculty Filter
      if (facultyFilter !== 'all') {
        const uFac = (u.faculty || '').toUpperCase();
        const uProg = (u.degree_programme || u.degree || '').toLowerCase();
        const facObj = UPSA_FACULTIES.find(f => f.code === facultyFilter);
        const matchesFac = uFac === facultyFilter || (facObj && facObj.programmes.some(p => uProg.includes(p.toLowerCase())));
        if (!matchesFac) return false;
      }

      // Plan Filter
      if (planFilter !== 'all') {
        const activeSub = Array.isArray(u.subscriptions) ? u.subscriptions.find((s: any) => s.status === 'active') : null;
        const currentPlan = activeSub ? activeSub.plan_id : (u.plan || 'free');
        if (currentPlan !== planFilter) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name_asc') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'plan_desc') {
        const getWeight = (user: any) => {
          const sub = Array.isArray(user.subscriptions) ? user.subscriptions.find((s: any) => s.status === 'active') : null;
          const p = sub ? sub.plan_id : (user.plan || 'free');
          return p === 'ultra' ? 3 : p === 'pro' ? 2 : 1;
        };
        return getWeight(b) - getWeight(a);
      }
      return 0;
    });

    return result;
  }, [users, cohortTab, searchTerm, facultyFilter, planFilter, sortBy]);

  // Selection Logic
  const allFilteredSelected = useMemo(() => {
    if (filteredAndSortedUsers.length === 0) return false;
    return filteredAndSortedUsers.every((u) => selectedUserIds.includes(u.id));
  }, [filteredAndSortedUsers, selectedUserIds]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredAndSortedUsers.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // CSV Export Utility
  const exportUsersCsv = (exportSelectionOnly = false) => {
    const listToExport = exportSelectionOnly
      ? users.filter((u) => selectedUserIds.includes(u.id))
      : filteredAndSortedUsers;

    if (listToExport.length === 0) {
      toast.error('No users to export');
      return;
    }

    const headers = ['User ID', 'Full Name', 'Email', 'Role', 'Plan', 'Institution', 'Programme', 'Year of Study', 'Created At'];
    const rows = listToExport.map((u) => {
      const activeSub = Array.isArray(u.subscriptions) ? u.subscriptions.find((s: any) => s.status === 'active') : null;
      const planName = activeSub ? activeSub.plan_id : (u.plan || 'free');
      const institutionName = u.institutions?.name || u.university || '';
      return [
        `"${u.id || ''}"`,
        `"${(u.full_name || '').replace(/"/g, '""')}"`,
        `"${(u.email || '').replace(/"/g, '""')}"`,
        `"${u.role || 'student'}"`,
        `"${planName}"`,
        `"${institutionName.replace(/"/g, '""')}"`,
        `"${(u.degree_programme || '').replace(/"/g, '""')}"`,
        `"${u.year_of_study || ''}"`,
        `"${u.created_at || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unistudy-users-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} accounts to CSV`);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [cohortTab, searchTerm, facultyFilter, planFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedUsers.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedUsers, currentPage]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[460px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* Header Section */}
      <AdminPageHeader
        title="User Directory"
        count={stats.total}
        subtitle="Manage student and administrator credentials, academic affiliations, subscription tiers, and account policies."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportUsersCsv(false)}
              className="h-9 gap-2 text-xs font-medium cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(true)}
              disabled={refreshing}
              className="h-9 gap-2 text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              Sync
            </Button>
          </>
        }
      />

      {/* Cohort Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AdminMetricCard
          label="Total Users"
          value={stats.total}
          subtext="All registrations"
          icon={Users}
          active={cohortTab === 'all'}
          onClick={() => setCohortTab('all')}
        />
        <AdminMetricCard
          label="Students"
          value={stats.students}
          subtext={`${stats.total > 0 ? Math.round((stats.students / stats.total) * 100) : 0}% of accounts`}
          icon={GraduationCap}
          active={cohortTab === 'students'}
          onClick={() => setCohortTab('students')}
        />
        <AdminMetricCard
          label="Admins"
          value={stats.admins}
          subtext="Privileged access"
          icon={Shield}
          active={cohortTab === 'admins'}
          onClick={() => setCohortTab('admins')}
        />
        <AdminMetricCard
          label="Pro & Ultra"
          value={stats.paid}
          subtext="Active paid plans"
          deltaTone="positive"
          icon={Crown}
          active={cohortTab === 'paid'}
          onClick={() => setCohortTab('paid')}
        />
        <AdminMetricCard
          label="Suspended"
          value={stats.suspended}
          subtext="Restricted access"
          deltaTone={stats.suspended > 0 ? 'negative' : 'neutral'}
          icon={Ban}
          active={cohortTab === 'suspended'}
          onClick={() => setCohortTab('suspended')}
        />
      </div>

      {/* Control Deck: Search, Filters, Cohort Segment */}
      <div className="space-y-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Cohort Segment Tabs */}
          <Tabs value={cohortTab} onValueChange={(v: any) => setCohortTab(v)} className="w-auto">
            <TabsList className="bg-muted/70 p-1 h-9">
              <TabsTrigger value="all" className="text-xs gap-1.5 px-3">
                All <span className="opacity-60 text-[10px]">({stats.total})</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="text-xs gap-1.5 px-3">
                Students <span className="opacity-60 text-[10px]">({stats.students})</span>
              </TabsTrigger>
              <TabsTrigger value="admins" className="text-xs gap-1.5 px-3">
                Admins <span className="opacity-60 text-[10px]">({stats.admins})</span>
              </TabsTrigger>
              <TabsTrigger value="paid" className="text-xs gap-1.5 px-3">
                Paid Plans <span className="opacity-60 text-[10px]">({stats.paid})</span>
              </TabsTrigger>
              <TabsTrigger value="suspended" className="text-xs gap-1.5 px-3 text-rose-600 dark:text-rose-400">
                Suspended <span className="opacity-60 text-[10px]">({stats.suspended})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Clear when filters active */}
          {(searchTerm || facultyFilter !== 'all' || planFilter !== 'all' || cohortTab !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFacultyFilter('all');
                setPlanFilter('all');
                setCohortTab('all');
              }}
              className="text-xs h-8 text-muted-foreground hover:text-foreground self-start lg:self-auto gap-1"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
          {/* Search Box */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* UPSA Faculty Filter */}
          <div className="lg:col-span-3">
            <Select value={facultyFilter} onValueChange={(v) => setFacultyFilter(v || 'all')}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All UPSA Faculties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All UPSA Faculties</SelectItem>
                {UPSA_FACULTIES.map(fac => (
                  <SelectItem key={fac.code} value={fac.code} className="text-xs">
                    [{fac.code}] {fac.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan Filter */}
          <div className="lg:col-span-2">
            <Select value={planFilter} onValueChange={(v) => setPlanFilter(v || 'all')}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free Tier</SelectItem>
                <SelectItem value="pro">Pro Plan</SelectItem>
                <SelectItem value="ultra">Ultra Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Selector */}
          <div className="lg:col-span-3">
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Join Date: Newest First</SelectItem>
                <SelectItem value="oldest">Join Date: Oldest First</SelectItem>
                <SelectItem value="name_asc">Alphabetical (Name A–Z)</SelectItem>
                <SelectItem value="plan_desc">Plan Tier (Ultra → Free)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Batch Action Bar */}
        {selectedUserIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs px-2 py-0.5 font-mono">
                {selectedUserIds.length} Selected
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Perform bulk updates across selected accounts
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={batchActionLoading}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "h-8 text-xs gap-1.5")}
                >
                  <Shield className="w-3.5 h-3.5" /> Bulk Role
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBatchRole('student')}>Set as Student</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchRole('admin')}>Set as Admin</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleBatchRole('suspended')}
                    className="text-rose-600 focus:text-rose-600"
                  >
                    Suspend Accounts
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={batchActionLoading}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "h-8 text-xs gap-1.5")}
                >
                  <Crown className="w-3.5 h-3.5" /> Bulk Plan
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBatchPlan('free')}>Set Free Tier</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchPlan('pro')}>Upgrade to Pro</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchPlan('ultra')}>Upgrade to Ultra</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => exportUsersCsv(true)}
                disabled={batchActionLoading}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Selected
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserIds([])}
                disabled={batchActionLoading}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Users Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] font-semibold text-muted-foreground bg-muted/40 border-b border-border uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3.5">User Profile</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Plan</th>
                <th className="px-4 py-3.5">Institution & Degree</th>
                <th className="px-4 py-3.5">Joined</th>
                <th className="px-4 py-3.5 text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const activeSub = Array.isArray(user.subscriptions)
                  ? user.subscriptions.find((s: any) => s.status === 'active')
                  : null;
                const planName = activeSub ? activeSub.plan_id : (user.plan || 'free');
                const institutionName =
                  user.institutions?.name ||
                  user.university ||
                  (user.institution_id && !/^[0-9a-fA-F-]{36}$/.test(user.institution_id)
                    ? user.institution_id
                    : 'Not specified');
                const abbreviation = user.institutions?.abbreviation;

                const initials = (user.full_name || user.email || 'U')
                  .split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      "hover:bg-muted/40 transition-colors cursor-pointer group",
                      isSelected && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => handleOpenUser(user)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center" onClick={(e) => toggleSelectUser(user.id, e)}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        aria-label={`Select ${user.full_name || user.email}`}
                      />
                    </td>

                    {/* Profile */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-primary/20">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground text-xs truncate">
                              {user.full_name || 'Unnamed User'}
                            </span>
                            {user.role === 'admin' && (
                              <Shield className="w-3 h-3 text-[#D89A06] shrink-0" />
                            )}
                          </div>
                          <div className="text-muted-foreground text-[11px] truncate flex items-center gap-1">
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      {user.role === 'admin' ? (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider font-semibold bg-[#D89A06]/10 text-[#D89A06] border-[#D89A06]/30">
                          Admin
                        </Badge>
                      ) : user.role === 'suspended' ? (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider font-medium text-muted-foreground border-border/80">
                          Student
                        </Badge>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3.5">
                      {planName === 'ultra' ? (
                        <Badge variant="outline" className="text-[10px] font-mono tracking-wider font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                          <Crown className="w-2.5 h-2.5" /> Ultra
                        </Badge>
                      ) : planName === 'pro' ? (
                        <Badge variant="outline" className="text-[10px] font-mono tracking-wider font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                          <Zap className="w-2.5 h-2.5" /> Pro
                        </Badge>
                      ) : (
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">Free</span>
                      )}
                    </td>

                    {/* UPSA Faculty & Programme */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-primary border-primary/30 font-bold">
                          {user.faculty || 'FITCS'}
                        </Badge>
                        <span className="font-medium text-foreground text-xs">
                          {user.degree_programme || user.degree || 'UPSA Degree Programme'}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[11px] truncate max-w-[280px]">
                        UPSA • {formatAcademicLevel(user.year_of_study, user.degree_programme || user.degree)}
                      </div>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      <div className="text-xs font-medium text-foreground">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-[10px] opacity-70">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>

                    {/* Actions Menu */}
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'icon' }),
                            "h-7 w-7 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                          )}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuLabel className="text-[10px] uppercase font-mono text-muted-foreground">
                            User Operations
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenUser(user)} className="gap-2">
                            <ArrowUpRight className="w-3.5 h-3.5" /> View Account
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(user.id, 'User ID')} className="gap-2">
                            <Copy className="w-3.5 h-3.5" /> Copy UID
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(user.email, 'Email address')} className="gap-2">
                            <Copy className="w-3.5 h-3.5" /> Copy Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user.id)} className="gap-2">
                            <KeyRound className="w-3.5 h-3.5" /> Password Reset Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-[10px] uppercase font-mono text-muted-foreground">
                            Role & Plan
                          </DropdownMenuLabel>
                          {user.role === 'admin' ? (
                            <DropdownMenuItem onClick={() => handleUpdateRole(user.id, 'student')}>
                              Make Student
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUpdateRole(user.id, 'admin')}>
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleUpdatePlan(user.id, planName === 'ultra' ? 'free' : 'ultra')}>
                            {planName === 'ultra' ? 'Demote to Free' : 'Promote to Ultra'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.role === 'suspended' ? (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(user.id, 'student')}
                              className="text-emerald-600 focus:text-emerald-600 gap-2"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Unsuspend Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(user.id, 'suspended')}
                              className="text-orange-600 focus:text-orange-600 gap-2"
                            >
                              <Ban className="w-3.5 h-3.5" /> Suspend Account
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-rose-600 focus:text-rose-600 gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-2">
                      <div className="p-3 bg-muted rounded-full text-muted-foreground mb-1">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-sm">No accounts match query</h3>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search criteria, cohort selection, or clear filters.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          setFacultyFilter('all');
                          setPlanFilter('all');
                          setCohortTab('all');
                        }}
                        className="text-xs h-8 mt-2"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredAndSortedUsers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-xs text-muted-foreground">
            <span className="tabular-nums">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} accounts
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <span className="font-mono font-medium text-foreground tabular-nums px-1">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Account Profile Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-background p-0 border-l border-border flex flex-col">
          {selectedUser && (
            <>
              {/* Drawer Top Header Banner */}
              <div className="p-6 border-b border-border bg-muted/20">
                <SheetHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold font-mono text-base flex items-center justify-center border border-primary/20 shrink-0">
                        {(selectedUser.full_name || selectedUser.email || 'U')
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <SheetTitle className="text-xl font-bold">
                          {selectedUser.full_name || 'Unnamed User'}
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground font-mono mt-0.5">
                          {selectedUser.email}
                        </SheetDescription>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {selectedUser.role === 'admin' ? (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-[#D89A06]/10 text-[#D89A06] border-[#D89A06]/30">
                          Admin
                        </Badge>
                      ) : selectedUser.role === 'suspended' ? (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase text-muted-foreground">
                          Student
                        </Badge>
                      )}

                      <Badge variant="outline" className="text-[10px] font-mono uppercase bg-background">
                        {selectedUser.plan || 'Free'} Plan
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                {/* UID pill & created info */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>UID:</span>
                    <CopyableId value={selectedUser.id} truncateLength={12} toastMessage="User ID copied" />
                  </div>
                  <span>
                    Joined {format(new Date(selectedUser.created_at), 'MMM d, yyyy (p)')}
                  </span>
                </div>
              </div>

              {/* Drawer Body with Tabs */}
              <div className="p-6 flex-1 space-y-6">
                <Tabs defaultValue="academic" className="w-full">
                  <TabsList className="w-full grid grid-cols-4 bg-muted/60 h-9 p-1 mb-5">
                    <TabsTrigger value="academic" className="text-xs gap-1">
                      <GraduationCap className="w-3.5 h-3.5" /> Academic
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs gap-1">
                      <Zap className="w-3.5 h-3.5" /> AI Quota
                    </TabsTrigger>
                    <TabsTrigger value="courses" className="text-xs gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Courses
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="text-xs gap-1">
                      <Activity className="w-3.5 h-3.5" /> Audit Log
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Academic Dossier */}
                  <TabsContent value="academic" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">UPSA Affiliation</span>
                        <span className="font-semibold text-foreground text-sm block">
                          University of Professional Studies, Accra
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono mt-1 text-primary border-primary/30">
                          Faculty: {selectedUser.faculty || 'FITCS'}
                        </Badge>
                      </div>

                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">Programme</span>
                        <span className="font-semibold text-foreground text-sm block">
                          {selectedUser.degree_programme || 'Not specified'}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Level: {selectedUser.year_of_study ? formatAcademicLevel(selectedUser.year_of_study, selectedUser.degree_programme) : 'Unspecified'}
                        </span>
                      </div>

                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">Account Status</span>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", selectedUser.role === 'suspended' ? "bg-rose-500" : "bg-emerald-500")} />
                          <span className="font-semibold capitalize text-foreground">
                            {selectedUser.role === 'suspended' ? 'Suspended' : 'Active Account'}
                          </span>
                        </div>
                        {selectedUser.suspend_reason && (
                          <p className="text-[11px] text-rose-500 mt-1">Reason: {selectedUser.suspend_reason}</p>
                        )}
                      </div>

                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">Registered Email</span>
                        <span className="font-semibold text-foreground block truncate">
                          {selectedUser.email}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Auth Verified
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: AI Quota & Telemetry */}
                  <TabsContent value="ai" className="space-y-4 m-0">
                    {loadingDetails ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 border rounded-xl bg-card space-y-1">
                            <span className="text-xs text-muted-foreground">Today's AI Requests</span>
                            <div className="text-2xl font-bold font-mono">
                              {userDetails?.aiUsage?.today || 0}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Rolling 24hr window</span>
                          </div>

                          <div className="p-4 border rounded-xl bg-card space-y-1">
                            <span className="text-xs text-muted-foreground">Monthly AI Volume</span>
                            <div className="text-2xl font-bold font-mono">
                              {userDetails?.aiUsage?.month || 0}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Current billing cycle</span>
                          </div>
                        </div>

                        <div className="p-4 border rounded-xl bg-muted/20 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Subscription Tier</span>
                            <Badge variant="outline" className="capitalize font-mono">
                              {selectedUser.plan || 'Free'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Rate Limits</span>
                            <span className="font-mono text-foreground">Standard Guard Active</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Tutor Model Gateway</span>
                            <span className="font-mono text-foreground">Groq / Gemini Hybrid</span>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* TAB 3: Enrolled Courses */}
                  <TabsContent value="courses" className="space-y-3 m-0">
                    {loadingDetails ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : userDetails?.courses?.length > 0 ? (
                      <div className="space-y-2">
                        {userDetails.courses.map((c: any) => (
                          <div key={c.id} className="p-3 border rounded-lg bg-card text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-primary">
                                  {c.course_code}
                                </span>
                                <span>{c.title}</span>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Registered
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                        No enrolled courses recorded for this student.
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 4: Audit Log */}
                  <TabsContent value="audit" className="space-y-3 m-0">
                    {loadingDetails ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : userDetails?.recentActivity?.length > 0 ? (
                      <div className="space-y-2.5">
                        {userDetails.recentActivity.map((log: any) => (
                          <div key={log.id} className="p-3 border rounded-lg bg-card text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold font-mono text-foreground">
                                {log.action_type}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM d, p')}
                              </span>
                            </div>
                            {log.details && (
                              <div className="text-[10px] text-muted-foreground font-mono bg-muted/30 p-1.5 rounded">
                                {JSON.stringify(log.details)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                        No admin actions recorded for this user.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Operations & Access Controls */}
                <div className="space-y-3 pt-5 border-t border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin Access & Account Controls
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Role Switcher */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "w-full justify-start gap-2 text-xs h-9")}
                        disabled={updating}
                      >
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Role: <strong className="capitalize">{selectedUser.role || 'student'}</strong></span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 text-xs">
                        <DropdownMenuItem onClick={() => handleUpdateRole(selectedUser.id, 'student')}>
                          Set as Student
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(selectedUser.id, 'admin')}>
                          Set as Administrator
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Plan Switcher */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "w-full justify-start gap-2 text-xs h-9")}
                        disabled={updating}
                      >
                        <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Plan: <strong className="capitalize">{selectedUser.plan || 'free'}</strong></span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 text-xs">
                        <DropdownMenuItem onClick={() => handleUpdatePlan(selectedUser.id, 'free')}>
                          Free Tier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdatePlan(selectedUser.id, 'pro')}>
                          Pro Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdatePlan(selectedUser.id, 'ultra')}>
                          Ultra Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Password Reset */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-xs h-9"
                      disabled={updating}
                      onClick={() => handleResetPassword(selectedUser.id)}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-muted-foreground" /> Copy Recovery Link
                    </Button>

                    {/* Suspend / Unsuspend */}
                    {selectedUser.role === 'suspended' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs h-9 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        onClick={() => handleUpdateRole(selectedUser.id, 'student')}
                        disabled={updating}
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Unsuspend User
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs h-9 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950"
                        onClick={() => handleUpdateRole(selectedUser.id, 'suspended')}
                        disabled={updating}
                      >
                        <Ban className="w-3.5 h-3.5" /> Suspend User
                      </Button>
                    )}
                  </div>

                  {/* Destructive Action */}
                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-center gap-2 text-xs h-9"
                      disabled={updating}
                      onClick={() => handleDeleteUser(selectedUser.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Permanently Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={!!confirmDialog?.open}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        loading={updating || batchActionLoading}
        onConfirm={() => confirmDialog?.onConfirm()}
      />
    </div>
  );
}
