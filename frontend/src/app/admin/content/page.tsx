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
  Loader2,
  Trash2,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  BookOpen,
  ExternalLink,
  Eye,
  RefreshCw,
  Download,
  X,
  MoreVertical,
  Filter,
  User,
  GraduationCap,
  Calendar,
  Layers,
  Check,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: string;
  type: 'lecture' | 'past_paper';
  title: string;
  course_code: string;
  course_title: string;
  institution_name: string;
  institution_abbr: string;
  author_name: string;
  author_email: string;
  author_id: string;
  created_at: string;
  file_url: string | null;
  slide_count: number | null;
  week?: number | null;
  year?: number | null;
  exam_type?: string | null;
  total_questions?: number | null;
  status: 'clean' | 'flagged' | 'pending' | 'approved';
  flags: Array<{
    id: string;
    reason: string;
    created_at: string;
    reporter_name: string;
    reporter_email: string;
    reporter_id: string;
  }>;
}

export default function ContentModerationPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    lectures: 0,
    pastPapers: 0,
    flagged: 0,
    moderatedActions: 0,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Triage
  const [activeTab, setActiveTab] = useState<'all' | 'flagged' | 'lectures' | 'past_papers'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'flagged_first' | 'title_asc'>('newest');

  // Multi-Selection & Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Inspection Drawer
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContent = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await apiFetch('/admin/content');
      const items: ContentItem[] = Array.isArray(res) ? res : (res.content || []);
      setContent(items);

      if (res.stats) {
        setStats(res.stats);
      } else {
        const flaggedCount = items.filter((i) => i.flags && i.flags.length > 0).length;
        const lecturesCount = items.filter((i) => i.type === 'lecture').length;
        const ppCount = items.filter((i) => i.type === 'past_paper').length;
        setStats({
          total: items.length,
          lectures: lecturesCount,
          pastPapers: ppCount,
          flagged: flaggedCount,
          moderatedActions: res.recentAuditLogs?.length || 0,
        });
      }

      if (res.recentAuditLogs) {
        setAuditLogs(res.recentAuditLogs);
      }
    } catch (err: any) {
      console.error("Failed to fetch admin content:", err);
      toast.error(err.message || 'Failed to load content queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  // Single Item Handlers
  const handleDeleteItem = async (item: ContentItem) => {
    if (!confirm(`Are you sure you want to permanently take down and delete "${item.title}"?`)) return;
    setActionLoading(true);
    try {
      await apiFetch(`/admin/content/${item.id}?type=${item.type}`, { method: 'DELETE' });
      toast.success(`Removed ${item.type === 'past_paper' ? 'Past Paper' : 'Lecture'} successfully`);
      setContent((prev) => prev.filter((i) => i.id !== item.id));
      if (selectedItem?.id === item.id) setSelectedItem(null);
      await fetchContent();
    } catch (err: any) {
      toast.error(err.message || 'Could not remove content');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveItem = async (item: ContentItem) => {
    setActionLoading(true);
    try {
      await apiFetch('/admin/content/approve', {
        method: 'POST',
        body: JSON.stringify({ id: item.id, type: item.type })
      });
      toast.success(`Approved "${item.title}" and cleared all pending reports`);
      await fetchContent();
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => (prev ? { ...prev, status: 'approved', flags: [] } : null));
      }
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissFlag = async (flagId: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/admin/content/dismiss-flag/${flagId}`, { method: 'POST' });
      toast.success('Report dismissed');
      await fetchContent();
      if (selectedItem) {
        setSelectedItem((prev) => {
          if (!prev) return null;
          const updatedFlags = prev.flags.filter((f) => f.id !== flagId);
          return {
            ...prev,
            flags: updatedFlags,
            status: updatedFlags.length > 0 ? 'flagged' : 'clean'
          };
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to dismiss flag');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Handlers
  const handleBatchAction = async (action: 'delete' | 'approve' | 'dismiss_flags') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !confirm(`Permanently take down and delete ${selectedIds.length} items?`)) return;

    setBatchLoading(true);
    try {
      const selectedItems = content.filter((i) => selectedIds.includes(i.id));
      const payload = selectedItems.map((i) => ({ id: i.id, type: i.type }));

      await apiFetch('/admin/content/batch', {
        method: 'POST',
        body: JSON.stringify({ action, items: payload })
      });

      toast.success(`Batch ${action} completed for ${selectedIds.length} items`);
      setSelectedIds([]);
      await fetchContent();
    } catch (err: any) {
      toast.error(err.message || 'Batch operation failed');
    } finally {
      setBatchLoading(false);
    }
  };

  // Filtered and Sorted Content List
  const filteredAndSortedContent = useMemo(() => {
    let result = content.filter((item) => {
      // Tab filter
      if (activeTab === 'flagged' && item.flags.length === 0) return false;
      if (activeTab === 'lectures' && item.type !== 'lecture') return false;
      if (activeTab === 'past_papers' && item.type !== 'past_paper') return false;

      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // Status filter
      if (statusFilter === 'flagged' && item.flags.length === 0) return false;
      if (statusFilter === 'clean' && item.flags.length > 0) return false;
      if (statusFilter === 'approved' && item.status !== 'approved') return false;

      // Search term
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchesTitle = (item.title || '').toLowerCase().includes(q);
        const matchesCode = (item.course_code || '').toLowerCase().includes(q);
        const matchesCourse = (item.course_title || '').toLowerCase().includes(q);
        const matchesAuthor = (item.author_name || '').toLowerCase().includes(q);
        const matchesEmail = (item.author_email || '').toLowerCase().includes(q);
        const matchesReason = item.flags.some((f) => f.reason.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCode && !matchesCourse && !matchesAuthor && !matchesEmail && !matchesReason) {
          return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'flagged_first') return b.flags.length - a.flags.length;
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

    return result;
  }, [content, activeTab, typeFilter, statusFilter, searchTerm, sortBy]);

  // Selection Checkbox Logic
  const allFilteredSelected = useMemo(() => {
    if (filteredAndSortedContent.length === 0) return false;
    return filteredAndSortedContent.every((i) => selectedIds.includes(i.id));
  }, [filteredAndSortedContent, selectedIds]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedContent.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export CSV Utility
  const exportContentCsv = () => {
    const listToExport = selectedIds.length > 0
      ? content.filter((i) => selectedIds.includes(i.id))
      : filteredAndSortedContent;

    if (listToExport.length === 0) {
      toast.error('No items to export');
      return;
    }

    const headers = ['ID', 'Type', 'Title', 'Course Code', 'Institution', 'Author Name', 'Author Email', 'Flags Count', 'Status', 'Created At'];
    const rows = listToExport.map((i) => [
      `"${i.id}"`,
      `"${i.type}"`,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${i.course_code || ''}"`,
      `"${i.institution_name || ''}"`,
      `"${(i.author_name || '').replace(/"/g, '""')}"`,
      `"${(i.author_email || '').replace(/"/g, '""')}"`,
      `"${i.flags.length}"`,
      `"${i.status}"`,
      `"${i.created_at}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unistudy-moderation-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} moderation records to CSV`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-mono">Loading moderation queue & safety flags...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
              Trust & Safety • Triage Center
            </Badge>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">
              {filteredAndSortedContent.length} items in view
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Content Moderation</h1>
          <p className="text-muted-foreground text-sm max-w-2xl mt-0.5">
            Audit study materials, past exam questions, lecture slide decks, and community-reported flags for academic integrity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportContentCsv}
            className="h-9 gap-2 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Export Moderation CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchContent(true)}
            disabled={refreshing}
            className="h-9 gap-2 text-xs font-medium"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Sync Queue
          </Button>
        </div>
      </div>

      {/* KPI Queue Ribbon (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card
          onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
          className={cn(
            "p-4 cursor-pointer transition-all hover:border-primary/50 relative overflow-hidden",
            activeTab === 'all' && statusFilter === 'all' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Content</span>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">{stats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Uploaded repository items</p>
        </Card>

        <Card
          onClick={() => { setActiveTab('flagged'); setStatusFilter('all'); }}
          className={cn(
            "p-4 cursor-pointer transition-all hover:border-rose-500/50 relative overflow-hidden",
            activeTab === 'flagged' ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/20" : "bg-card"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Needs Review
            </span>
            <AlertTriangle className={cn("w-4 h-4 text-rose-500", stats.flagged > 0 && "animate-pulse")} />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">
            {stats.flagged}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {stats.flagged === 0 ? 'Queue clean & healthy' : 'Active user reports'}
          </p>
        </Card>

        <Card
          onClick={() => { setActiveTab('lectures'); setStatusFilter('all'); }}
          className={cn(
            "p-4 cursor-pointer transition-all hover:border-blue-500/50 relative overflow-hidden",
            activeTab === 'lectures' ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20" : "bg-card"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lectures</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
            {stats.lectures}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Slide decks & recordings</p>
        </Card>

        <Card
          onClick={() => { setActiveTab('past_papers'); setStatusFilter('all'); }}
          className={cn(
            "p-4 cursor-pointer transition-all hover:border-purple-500/50 relative overflow-hidden",
            activeTab === 'past_papers' ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/20" : "bg-card"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past Papers</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-purple-600 dark:text-purple-400">
            {stats.pastPapers}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Exams & question banks</p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enforcements</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.moderatedActions}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Actions logged in audit</p>
        </Card>
      </div>

      {/* Control Deck: Tabs, Search, Filters, Batch Actions */}
      <div className="space-y-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Queue Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
            <TabsList className="bg-muted/70 p-1 h-9">
              <TabsTrigger value="all" className="text-xs gap-1.5 px-3">
                All Content <span className="opacity-60 text-[10px]">({stats.total})</span>
              </TabsTrigger>
              <TabsTrigger value="flagged" className="text-xs gap-1.5 px-3 text-rose-600 dark:text-rose-400 font-semibold">
                Needs Review <span className="opacity-75 text-[10px]">({stats.flagged})</span>
              </TabsTrigger>
              <TabsTrigger value="lectures" className="text-xs gap-1.5 px-3">
                Lectures <span className="opacity-60 text-[10px]">({stats.lectures})</span>
              </TabsTrigger>
              <TabsTrigger value="past_papers" className="text-xs gap-1.5 px-3">
                Past Papers <span className="opacity-60 text-[10px]">({stats.pastPapers})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Reset Filters */}
          {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || activeTab !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setStatusFilter('all');
                setActiveTab('all');
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
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, course code (e.g. DCIT101), author, or flag reason..."
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

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || 'all')}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lecture">Lecture Slides</SelectItem>
                <SelectItem value="past_paper">Past Paper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="flagged">Flagged / Reported</SelectItem>
                <SelectItem value="clean">Clean / Unreported</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
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
                <SelectItem value="newest">Upload Date: Newest First</SelectItem>
                <SelectItem value="oldest">Upload Date: Oldest First</SelectItem>
                <SelectItem value="flagged_first">Highest Risk / Most Flagged</SelectItem>
                <SelectItem value="title_asc">Alphabetical (Title A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Batch Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs px-2 py-0.5 font-mono">
                {selectedIds.length} Selected
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Apply moderation policy across selected items
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('approve')}
                disabled={batchLoading}
                className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Clear
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('dismiss_flags')}
                disabled={batchLoading}
                className="h-8 text-xs gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" /> Dismiss Flags
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBatchAction('delete')}
                disabled={batchLoading}
                className="h-8 text-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Take Down Selected
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                disabled={batchLoading}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Deselect
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Moderation Table */}
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
                <th className="px-4 py-3.5">Content Asset</th>
                <th className="px-4 py-3.5">Course & Institution</th>
                <th className="px-4 py-3.5">Author / Uploader</th>
                <th className="px-4 py-3.5">Moderation Status</th>
                <th className="px-4 py-3.5">Uploaded</th>
                <th className="px-4 py-3.5 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAndSortedContent.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const hasFlags = item.flags.length > 0;

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "hover:bg-muted/40 transition-colors cursor-pointer group",
                      isSelected && "bg-primary/5 hover:bg-primary/10",
                      hasFlags && "bg-rose-500/[0.02]"
                    )}
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center" onClick={(e) => toggleSelectItem(item.id, e)}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        aria-label={`Select ${item.title}`}
                      />
                    </td>

                    {/* Content Identity */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                          item.type === 'lecture'
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                        )}>
                          {item.type === 'lecture' ? (
                            <BookOpen className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground text-xs hover:text-primary transition-colors">
                              {item.title}
                            </span>
                            {item.file_url && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground"
                                title="Open file asset"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 font-mono">
                            <span className="capitalize">{item.type.replace('_', ' ')}</span>
                            {item.slide_count && <span>• {item.slide_count} slides</span>}
                            {item.week && <span>• Wk {item.week}</span>}
                            {item.total_questions && <span>• {item.total_questions} questions</span>}
                            {item.year && <span>• {item.year}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Course & Institution */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-foreground px-1.5 py-0.5 rounded bg-muted/60 border border-border/50">
                          {item.course_code}
                        </span>
                        {item.institution_abbr && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                            {item.institution_abbr}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-[11px] truncate max-w-[200px] mt-0.5">
                        {item.course_title || item.institution_name || 'General Academic Course'}
                      </div>
                    </td>

                    {/* Author / Uploader */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground text-xs truncate max-w-[160px]">
                        {item.author_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                        {item.author_email || 'Verified Student'}
                      </div>
                    </td>

                    {/* Moderation Status */}
                    <td className="px-4 py-3.5">
                      {hasFlags ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
                            <AlertTriangle className="w-3 h-3" /> {item.flags.length} Flag{item.flags.length > 1 ? 's' : ''}
                          </Badge>
                          <div className="text-[10px] text-rose-500 truncate max-w-[180px]">
                            {item.flags[0].reason}
                          </div>
                        </div>
                      ) : item.status === 'approved' ? (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider font-medium text-muted-foreground border-border/80">
                          Clean
                        </Badge>
                      )}
                    </td>

                    {/* Upload Date */}
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      <div className="text-xs font-medium text-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-[10px] opacity-70">
                        {format(new Date(item.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>

                    {/* Action Deck */}
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedItem(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Inspect Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              buttonVariants({ variant: 'ghost', size: 'icon' }),
                              "h-7 w-7 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuLabel className="text-[10px] uppercase font-mono text-muted-foreground">
                              Content Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedItem(item)} className="gap-2">
                              <Eye className="w-3.5 h-3.5" /> Inspect Dossier
                            </DropdownMenuItem>

                            {item.file_url && (
                              <DropdownMenuItem
                                onClick={() => window.open(item.file_url!, '_blank')}
                                className="gap-2"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Asset File
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleApproveItem(item)}
                              className="text-emerald-600 focus:text-emerald-600 gap-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Clear
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleDeleteItem(item)}
                              className="text-rose-600 focus:text-rose-600 gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Take Down / Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedContent.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-2">
                      <div className="p-3 bg-muted rounded-full text-muted-foreground mb-1">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-sm">No content matches criteria</h3>
                      <p className="text-xs text-muted-foreground">
                        Your moderation queue is clean. Try adjusting filters or search queries.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          setTypeFilter('all');
                          setStatusFilter('all');
                          setActiveTab('all');
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
      </Card>

      {/* Deepened Content Dossier Drawer */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-background p-0 border-l border-border flex flex-col">
          {selectedItem && (
            <>
              {/* Drawer Top Header Banner */}
              <div className="p-6 border-b border-border bg-muted/20">
                <SheetHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                        selectedItem.type === 'lecture'
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      )}>
                        {selectedItem.type === 'lecture' ? (
                          <BookOpen className="w-6 h-6" />
                        ) : (
                          <FileText className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <SheetTitle className="text-lg font-bold leading-snug">
                          {selectedItem.title}
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground font-mono mt-0.5">
                          ID: {selectedItem.id}
                        </SheetDescription>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {selectedItem.flags.length > 0 ? (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
                          <AlertTriangle className="w-3 h-3" /> {selectedItem.flags.length} Flag{selectedItem.flags.length > 1 ? 's' : ''}
                        </Badge>
                      ) : selectedItem.status === 'approved' ? (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase text-muted-foreground">
                          Clean
                        </Badge>
                      )}

                      <Badge variant="outline" className="text-[10px] font-mono uppercase capitalize bg-background">
                        {selectedItem.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                {/* Course & Date bar */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-foreground">{selectedItem.course_code}</span>
                    {selectedItem.course_title && <span>• {selectedItem.course_title}</span>}
                  </div>
                  <span>
                    Uploaded {format(new Date(selectedItem.created_at), 'MMM d, yyyy (p)')}
                  </span>
                </div>
              </div>

              {/* Drawer Body with Tabs */}
              <div className="p-6 flex-1 space-y-6">
                <Tabs defaultValue={selectedItem.flags.length > 0 ? "flags" : "details"} className="w-full">
                  <TabsList className="w-full grid grid-cols-3 bg-muted/60 h-9 p-1 mb-5">
                    <TabsTrigger value="details" className="text-xs gap-1">
                      <FileCheck className="w-3.5 h-3.5" /> Asset Specs
                    </TabsTrigger>
                    <TabsTrigger value="flags" className="text-xs gap-1">
                      <Flag className="w-3.5 h-3.5" /> Reports ({selectedItem.flags.length})
                    </TabsTrigger>
                    <TabsTrigger value="author" className="text-xs gap-1">
                      <User className="w-3.5 h-3.5" /> Uploader Info
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Asset Details */}
                  <TabsContent value="details" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">Course Code</span>
                        <span className="font-semibold text-foreground text-sm font-mono block">
                          {selectedItem.course_code}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {selectedItem.course_title || 'General Course'}
                        </span>
                      </div>

                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">Institution</span>
                        <span className="font-semibold text-foreground text-sm block">
                          {selectedItem.institution_name || 'Campus Wide'}
                        </span>
                        {selectedItem.institution_abbr && (
                          <Badge variant="secondary" className="text-[10px] font-mono mt-1">
                            {selectedItem.institution_abbr}
                          </Badge>
                        )}
                      </div>

                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">Asset Type</span>
                        <span className="font-semibold text-foreground block capitalize">
                          {selectedItem.type.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {selectedItem.slide_count ? `${selectedItem.slide_count} slides indexed` : (selectedItem.total_questions ? `${selectedItem.total_questions} questions` : 'Standard document')}
                        </span>
                      </div>

                      <div className="p-3.5 border rounded-lg bg-card space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block">File Asset</span>
                        {selectedItem.file_url ? (
                          <a
                            href={selectedItem.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-primary hover:underline text-xs flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open / Download File
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">No external file attached</span>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Flags & User Reports */}
                  <TabsContent value="flags" className="space-y-3 m-0">
                    {selectedItem.flags.length > 0 ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-600 dark:text-rose-400">
                          This asset has been reported by students or automated safety scans. Review each claim below.
                        </div>

                        {selectedItem.flags.map((flag) => (
                          <div key={flag.id} className="p-3.5 border border-border rounded-lg bg-card space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> Flagged Report
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(flag.created_at), 'MMM d, p')}
                              </span>
                            </div>

                            <div className="p-2.5 rounded bg-muted/40 font-mono text-[11px] text-foreground">
                              "{flag.reason}"
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                              <span>Reported by: <strong>{flag.reporter_name}</strong> ({flag.reporter_email})</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismissFlag(flag.id)}
                                disabled={actionLoading}
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                              >
                                Dismiss Report
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed rounded-lg text-center text-xs text-muted-foreground space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-foreground">Zero Active Reports</p>
                        <p>No community flags or copyright claims have been lodged against this content.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: Author & Ownership */}
                  <TabsContent value="author" className="space-y-4 m-0">
                    <div className="p-4 border rounded-lg bg-card space-y-3 text-xs">
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block mb-0.5">Author / Uploader</span>
                        <span className="font-semibold text-foreground text-sm block">
                          {selectedItem.author_name}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {selectedItem.author_email || 'Verified Student Account'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-border/60">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block mb-0.5">User ID</span>
                        <span className="font-mono text-muted-foreground text-[11px] block">
                          {selectedItem.author_id || 'System / Batch Imported'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-border/60">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono block mb-0.5">Academic Repository Policy</span>
                        <p className="text-[11px] text-muted-foreground">
                          All student uploads are bound by UniStudy's Honor Code and Academic Integrity Charter.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Operations & Enforcement Deck */}
                <div className="space-y-3 pt-5 border-t border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Moderation Enforcement Actions
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Approve & Clear Flags */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-xs h-9 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      disabled={actionLoading}
                      onClick={() => handleApproveItem(selectedItem)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Clear Flags
                    </Button>

                    {/* Open Asset File */}
                    {selectedItem.file_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs h-9"
                        onClick={() => window.open(selectedItem.file_url!, '_blank')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open File Asset
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs h-9 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> No External Asset
                      </Button>
                    )}
                  </div>

                  {/* Take Down / Delete */}
                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-center gap-2 text-xs h-9"
                      disabled={actionLoading}
                      onClick={() => handleDeleteItem(selectedItem)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Permanently Take Down & Delete Asset
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
