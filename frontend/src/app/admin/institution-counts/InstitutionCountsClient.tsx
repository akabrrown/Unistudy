'use client';

import { useState, useMemo, useTransition } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  Building2,
  Users,
  GraduationCap,
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  School,
  Download,
  Plus,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  FileText,
  BarChart3,
  Layers,
  Sparkles,
  Globe,
  Trash2,
  Copy,
  Check,
  X,
  Filter,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  InstitutionWithCount,
  fetchInstitutionCountsAction,
  createInstitutionAction,
  toggleVerifyInstitutionAction,
  runAutoAssociateDomainAction,
  deleteInstitutionAction
} from './actions';

interface Props {
  initialInstitutions: InstitutionWithCount[];
}

export default function InstitutionCountsClient({ initialInstitutions }: Props) {
  const [institutions, setInstitutions] = useState<InstitutionWithCount[]>(initialInstitutions);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'count_desc' | 'count_asc' | 'papers_desc' | 'name_asc'>('count_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Multi-select & Batch
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer / Inspection
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionWithCount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Institution Form Modal / Drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newCity, setNewCity] = useState('Accra');
  const [newType, setNewType] = useState('university');
  const [creating, setCreating] = useState(false);

  const pageSize = 15;

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await fetchInstitutionCountsAction();
      if (res.error) {
        toast.error('Failed to refresh: ' + res.error);
      } else {
        setInstitutions(res.data);
        toast.success('Campus registry refreshed');
      }
    });
  };

  // Toggle Verification Action
  const handleToggleVerification = async (inst: InstitutionWithCount) => {
    setActionLoading(true);
    try {
      const nextState = !inst.verified;
      const res = await toggleVerifyInstitutionAction(inst.id, nextState);
      if (res.error) throw new Error(res.error);

      setInstitutions((prev) =>
        prev.map((i) => (i.id === inst.id ? { ...i, verified: nextState } : i))
      );
      if (selectedInstitution?.id === inst.id) {
        setSelectedInstitution((prev) => (prev ? { ...prev, verified: nextState } : null));
      }
      toast.success(`${inst.name} is now ${nextState ? 'VERIFIED' : 'UNVERIFIED'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle verification');
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-Associate Domain
  const handleAutoAssociate = async (inst: InstitutionWithCount) => {
    if (!inst.domain) {
      toast.error('This institution does not have a registered domain');
      return;
    }
    setActionLoading(true);
    try {
      const res = await runAutoAssociateDomainAction(inst.domain, inst.id);
      if (res.error) throw new Error(res.error);

      toast.success(`Scanned domain @${inst.domain}: Auto-mapped ${res.matchedCount} student accounts!`);
      handleRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Auto-mapping scan failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Action
  const handleDeleteInstitution = async (inst: InstitutionWithCount) => {
    if (!confirm(`Permanently remove "${inst.name}" from the campus registry?`)) return;
    setActionLoading(true);
    try {
      const res = await deleteInstitutionAction(inst.id);
      if (res.error) throw new Error(res.error);

      setInstitutions((prev) => prev.filter((i) => i.id !== inst.id));
      if (selectedInstitution?.id === inst.id) setSelectedInstitution(null);
      toast.success(`Removed ${inst.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete institution');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Institution
  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createInstitutionAction({
        name: newName,
        abbreviation: newAbbr,
        domain: newDomain,
        city: newCity,
        type: newType,
        verified: true
      });
      if (res.error) throw new Error(res.error);

      toast.success(`Registered ${newName}`);
      setCreateOpen(false);
      setNewName('');
      setNewAbbr('');
      setNewDomain('');
      handleRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register institution');
    } finally {
      setCreating(false);
    }
  };

  // Aggregate Metrics
  const totalInstitutions = institutions.length;
  const totalStudents = useMemo(() => {
    return institutions.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
  }, [institutions]);
  const totalPastPapers = useMemo(() => {
    return institutions.reduce((acc, curr) => acc + (curr.pastPaperCount || 0), 0);
  }, [institutions]);
  const verifiedCount = useMemo(() => {
    return institutions.filter((i) => i.verified).length;
  }, [institutions]);

  const topInstitution = useMemo(() => {
    if (institutions.length === 0) return null;
    return institutions.reduce((prev, curr) => (curr.studentCount > (prev?.studentCount || 0) ? curr : prev), institutions[0]);
  }, [institutions]);

  // Extract unique types
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    institutions.forEach((i) => {
      if (i.type) set.add(i.type.toLowerCase());
    });
    return Array.from(set).sort();
  }, [institutions]);

  // Filtering & Sorting
  const filteredInstitutions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    const filtered = institutions.filter((inst) => {
      const matchesSearch =
        !q ||
        inst.name.toLowerCase().includes(q) ||
        (inst.abbreviation && inst.abbreviation.toLowerCase().includes(q)) ||
        (inst.domain && inst.domain.toLowerCase().includes(q)) ||
        (inst.city && inst.city.toLowerCase().includes(q));

      const matchesType =
        typeFilter === 'all' ||
        (inst.type && inst.type.toLowerCase() === typeFilter);

      const matchesVerification =
        verificationFilter === 'all' ||
        (verificationFilter === 'verified' ? inst.verified : !inst.verified);

      return matchesSearch && matchesType && matchesVerification;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'count_desc') {
        const diff = b.studentCount - a.studentCount;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (sortBy === 'count_asc') {
        const diff = a.studentCount - b.studentCount;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (sortBy === 'papers_desc') {
        return b.pastPaperCount - a.pastPaperCount;
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return filtered;
  }, [institutions, searchTerm, typeFilter, verificationFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredInstitutions.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedInstitutions = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredInstitutions.slice(start, start + pageSize);
  }, [filteredInstitutions, activePage, pageSize]);

  // Chart Data: Top 8 Institutions
  const top8ChartData = useMemo(() => {
    return [...institutions]
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 8)
      .map((i) => ({
        name: i.abbreviation || i.name.split(' ')[0],
        fullName: i.name,
        students: i.studentCount,
        papers: i.pastPaperCount
      }));
  }, [institutions]);

  // Selection Checkbox Logic
  const allFilteredSelected = useMemo(() => {
    if (paginatedInstitutions.length === 0) return false;
    return paginatedInstitutions.every((i) => selectedIds.includes(i.id));
  }, [paginatedInstitutions, selectedIds]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedInstitutions.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // CSV Export
  const exportDirectoryCsv = () => {
    const listToExport = selectedIds.length > 0
      ? institutions.filter((i) => selectedIds.includes(i.id))
      : filteredInstitutions;

    if (listToExport.length === 0) {
      toast.error('No institutions to export');
      return;
    }

    const headers = ['ID', 'Institution Name', 'Abbreviation', 'Category', 'Domain', 'City', 'Country', 'Verified', 'Student Count', 'Past Papers Count'];
    const rows = listToExport.map((i) => [
      `"${i.id}"`,
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${i.abbreviation || ''}"`,
      `"${i.type || 'university'}"`,
      `"${i.domain || ''}"`,
      `"${i.city || ''}"`,
      `"${i.country || 'Ghana'}"`,
      `"${i.verified ? 'Yes' : 'No'}"`,
      `"${i.studentCount}"`,
      `"${i.pastPaperCount}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unistudy-campus-directory-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${listToExport.length} campus records to CSV`);
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
              Campus Network • Territorial Coverage
            </Badge>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">
              {filteredInstitutions.length} campuses cataloged
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Institution Demographics</h1>
          <p className="text-muted-foreground text-sm max-w-2xl mt-0.5">
            Audit student enrollment density, verified university email domains, and past paper repository penetration across Ghana and West Africa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="h-9 gap-2 text-xs font-medium shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Register Campus
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportDirectoryCsv}
            className="h-9 gap-2 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" /> Export Directory CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="h-9 gap-2 text-xs font-medium"
          >
            <RotateCw className={cn("w-3.5 h-3.5", isPending && "animate-spin")} />
            Sync Counts
          </Button>
        </div>
      </div>

      {/* KPI Ribbon (5 High-Density Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Institutions</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">{totalInstitutions}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Accredited tertiary campuses</p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Students</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {totalStudents}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Linked active learners</p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verified Domains</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
            {verifiedCount} <span className="text-xs font-normal text-muted-foreground font-sans">/ {totalInstitutions}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Official .edu email domains</p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam Vault Papers</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-purple-600 dark:text-purple-400">
            {totalPastPapers}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Past questions indexed</p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leading Campus</span>
            <GraduationCap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold truncate text-foreground">
            {topInstitution?.abbreviation || topInstitution?.name?.split(' ')[0] || 'UPSA'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {topInstitution ? `${topInstitution.studentCount} students (${totalStudents > 0 ? Math.round((topInstitution.studentCount / totalStudents) * 100) : 0}%)` : 'None'}
          </p>
        </Card>
      </div>

      {/* Campus Distribution Visual Overview */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Campus Student Density & Exam Archive Penetration
              </CardTitle>
              <CardDescription className="text-xs">
                Comparison of top tertiary institutions by enrolled student population and available past papers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[200px] w-full pt-4">
          {top8ChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top8ChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} ${name === 'students' ? 'students' : 'papers'}`,
                    name === 'students' ? 'Enrolled Students' : 'Exam Papers'
                  ]}
                />
                <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="students" />
                <Bar dataKey="papers" fill="#a855f7" radius={[4, 4, 0, 0]} name="papers" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No institutional data to display in chart.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter & Control Deck */}
      <div className="space-y-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by campus name, abbreviation (UPSA, UG), domain, city..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
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
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v || 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Verification Status Filter */}
          <div className="lg:col-span-2">
            <Select
              value={verificationFilter}
              onValueChange={(v) => {
                setVerificationFilter(v || 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Verification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="verified">Verified Official</SelectItem>
                <SelectItem value="unverified">Unverified Domain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Selector */}
          <div className="lg:col-span-3">
            <Select
              value={sortBy}
              onValueChange={(v: any) => {
                setSortBy(v || 'count_desc');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count_desc">Most Enrolled Students</SelectItem>
                <SelectItem value="count_asc">Fewest Students</SelectItem>
                <SelectItem value="papers_desc">Most Exam Papers</SelectItem>
                <SelectItem value="name_asc">Alphabetical (Campus Name)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Batch Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs px-2 py-0.5 font-mono">
                {selectedIds.length} Campuses Selected
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Bulk export or update selected institutions
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={exportDirectoryCsv}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Selected CSV
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Institutions Table */}
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
                <th className="px-4 py-3.5">Institution Profile</th>
                <th className="px-4 py-3.5">Abbreviation</th>
                <th className="px-4 py-3.5">Academic Domain</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5 text-center">Past Papers</th>
                <th className="px-4 py-3.5 text-right">Student Body</th>
                <th className="px-4 py-3.5 text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedInstitutions.map((inst) => {
                const isSelected = selectedIds.includes(inst.id);
                const sharePct = totalStudents > 0 ? Math.round((inst.studentCount / totalStudents) * 100) : 0;

                return (
                  <tr
                    key={inst.id}
                    className={cn(
                      "hover:bg-muted/40 transition-colors cursor-pointer group",
                      isSelected && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => setSelectedInstitution(inst)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center" onClick={(e) => toggleSelectItem(inst.id, e)}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        aria-label={`Select ${inst.name}`}
                      />
                    </td>

                    {/* Institution Identity */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-primary/20">
                          {inst.abbreviation ? inst.abbreviation.slice(0, 3) : inst.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground text-xs hover:text-primary transition-colors">
                              {inst.name}
                            </span>
                            {inst.verified && (
                              <span title="Verified Official University">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-[11px] truncate flex items-center gap-1.5">
                            <span>{inst.city || 'Campus Wide'}, {inst.country || 'Ghana'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Abbreviation */}
                    <td className="px-4 py-3.5">
                      {inst.abbreviation ? (
                        <Badge variant="outline" className="font-mono text-[10px] font-bold px-1.5 py-0 uppercase">
                          {inst.abbreviation}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Domain */}
                    <td className="px-4 py-3.5">
                      {inst.domain ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <Globe className="w-3 h-3 opacity-60 shrink-0" />
                          <span className="text-foreground">{inst.domain}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Unassigned domain</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className="capitalize text-[10px] font-normal">
                        {inst.type || 'University'}
                      </Badge>
                    </td>

                    {/* Past Papers Count */}
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant="outline" className="font-mono text-[10px] font-medium text-purple-600 dark:text-purple-400 border-purple-500/20 bg-purple-500/5">
                        {inst.pastPaperCount} papers
                      </Badge>
                    </td>

                    {/* Student Count & Density Bar */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={inst.studentCount > 0 ? 'default' : 'outline'}
                          className={cn(
                            "font-mono font-bold text-xs px-2.5 py-0.5",
                            inst.studentCount > 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                          )}
                        >
                          {inst.studentCount} student{inst.studentCount !== 1 ? 's' : ''}
                        </Badge>
                        {inst.studentCount > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {sharePct}% of user base
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions Menu */}
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'icon' }),
                            "h-7 w-7 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuLabel className="text-[10px] uppercase font-mono text-muted-foreground">
                            Campus Controls
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelectedInstitution(inst)} className="gap-2">
                            <School className="w-3.5 h-3.5" /> View Campus Dossier
                          </DropdownMenuItem>

                          {inst.domain && (
                            <DropdownMenuItem onClick={() => handleAutoAssociate(inst)} className="gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-primary" /> Auto-Map Students (@domain)
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => handleToggleVerification(inst)} className="gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {inst.verified ? 'Revoke Verification' : 'Mark Verified Official'}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleDeleteInstitution(inst)}
                            className="text-rose-600 focus:text-rose-600 gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove from Registry
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}

              {filteredInstitutions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-2">
                      <div className="p-3 bg-muted rounded-full text-muted-foreground mb-1">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-sm">No institutions found</h3>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting search keywords, category filters, or domain status.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          setTypeFilter('all');
                          setVerificationFilter('all');
                          setSortBy('count_desc');
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

        {/* Live Pagination */}
        {filteredInstitutions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 border-t border-border/60 gap-3 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-medium text-foreground">{(activePage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-foreground">
                {Math.min(activePage * pageSize, filteredInstitutions.length)}
              </span>{' '}
              of <span className="font-medium text-foreground">{filteredInstitutions.length}</span> institutions
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={activePage <= 1}
                className="gap-1 h-8 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <span className="px-2 font-mono text-[11px]">
                Page {activePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage >= totalPages}
                className="gap-1 h-8 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Deepened Campus Dossier Drawer */}
      <Sheet open={!!selectedInstitution} onOpenChange={(open) => !open && setSelectedInstitution(null)}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-background p-0 border-l border-border flex flex-col">
          {selectedInstitution && (
            <>
              {/* Drawer Top Header Banner */}
              <div className="p-6 border-b border-border bg-muted/20">
                <SheetHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold font-mono text-base flex items-center justify-center border border-primary/20 shrink-0">
                        {selectedInstitution.abbreviation || selectedInstitution.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <SheetTitle className="text-xl font-bold leading-snug">
                          {selectedInstitution.name}
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground font-mono mt-0.5">
                          ID: {selectedInstitution.id}
                        </SheetDescription>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {selectedInstitution.verified ? (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified Official
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase text-muted-foreground">
                          Unverified
                        </Badge>
                      )}

                      <Badge variant="secondary" className="text-[10px] font-mono uppercase capitalize">
                        {selectedInstitution.type || 'University'}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                {/* Subtext info */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                  <span>{selectedInstitution.city || 'Campus Wide'}, {selectedInstitution.country || 'Ghana'}</span>
                  {selectedInstitution.domain && (
                    <span className="font-mono text-foreground font-semibold">@{selectedInstitution.domain}</span>
                  )}
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-6 flex-1 space-y-6 text-xs">
                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border rounded-xl bg-card space-y-1">
                    <span className="text-muted-foreground text-[10px] uppercase font-mono block">Enrolled Students</span>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {selectedInstitution.studentCount}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {totalStudents > 0 ? Math.round((selectedInstitution.studentCount / totalStudents) * 100) : 0}% of platform student body
                    </span>
                  </div>

                  <div className="p-4 border rounded-xl bg-card space-y-1">
                    <span className="text-muted-foreground text-[10px] uppercase font-mono block">Exam Papers in Vault</span>
                    <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                      {selectedInstitution.pastPaperCount}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Past questions indexed</span>
                  </div>
                </div>

                {/* Domain Auto-Mapping Card */}
                <div className="p-4 border border-border rounded-xl bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" /> Student Email Domain Rule
                    </span>
                    {selectedInstitution.domain ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        @{selectedInstitution.domain}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-rose-500">
                        Missing Domain
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Students who sign up using an email matching this domain (e.g. <code>student@{selectedInstitution.domain || 'campus.edu.gh'}</code>) will be automatically mapped to this university.
                  </p>
                  {selectedInstitution.domain && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoAssociate(selectedInstitution)}
                      disabled={actionLoading}
                      className="h-8 text-xs gap-1.5 mt-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Scan & Auto-Map Existing Accounts
                    </Button>
                  )}
                </div>

                {/* Operations & Management Deck */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Institutional Governance
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-xs h-9"
                      disabled={actionLoading}
                      onClick={() => handleToggleVerification(selectedInstitution)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedInstitution.verified ? 'Revoke Verification' : 'Verify Institution'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-xs h-9"
                      onClick={() => {
                        if (selectedInstitution.domain) {
                          navigator.clipboard.writeText(selectedInstitution.domain);
                          toast.success('Domain copied to clipboard');
                        }
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Copy Domain
                    </Button>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-center gap-2 text-xs h-9"
                      disabled={actionLoading}
                      onClick={() => handleDeleteInstitution(selectedInstitution)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Campus from Registry
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Register New Campus Modal / Drawer */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background p-6 border-l border-border flex flex-col justify-between">
          <div>
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <School className="w-5 h-5 text-primary" /> Register Tertiary Campus
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Add an accredited university, technical college, or polytechnic to UniStudy's campus directory.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreateInstitution} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-xs">Institution Full Name *</label>
                <Input
                  required
                  placeholder="e.g. University of Professional Studies, Accra"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-xs">Abbreviation / Tag</label>
                <Input
                  placeholder="e.g. UPSA, UG, KNUST"
                  value={newAbbr}
                  onChange={(e) => setNewAbbr(e.target.value)}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-xs">Official Email Domain</label>
                <Input
                  placeholder="e.g. upsamail.edu.gh (used for auto-mapping)"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="h-9 text-xs font-mono lowercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-xs">Campus City</label>
                  <Input
                    placeholder="e.g. Accra, Kumasi, Cape Coast"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-xs">Category</label>
                  <Select value={newType} onValueChange={(v) => setNewType(v || 'university')}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="technical_university">Technical Univ</SelectItem>
                      <SelectItem value="college">College of Education</SelectItem>
                      <SelectItem value="polytechnic">Polytechnic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="w-full h-9 text-xs font-semibold gap-2"
                >
                  {creating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Register Campus to Registry
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
