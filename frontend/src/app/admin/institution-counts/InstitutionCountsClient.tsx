'use client';

import { useState, useMemo, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, GraduationCap, Search, RotateCw, ChevronLeft, ChevronRight, CheckCircle2, School } from 'lucide-react';
import { toast } from 'sonner';
import { InstitutionWithCount, fetchInstitutionCountsAction } from './actions';

interface Props {
  initialInstitutions: InstitutionWithCount[];
}

export default function InstitutionCountsClient({ initialInstitutions }: Props) {
  const [institutions, setInstitutions] = useState<InstitutionWithCount[]>(initialInstitutions);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'count_desc' | 'count_asc' | 'name_asc' | 'name_desc'>('count_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const pageSize = 15;

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await fetchInstitutionCountsAction();
      if (res.error) {
        toast.error('Failed to refresh: ' + res.error);
      } else {
        setInstitutions(res.data);
        toast.success('Institution counts refreshed live');
      }
    });
  };

  // Extract unique types for the filter dropdown
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    institutions.forEach((i) => {
      if (i.type) set.add(i.type.toLowerCase());
    });
    return Array.from(set).sort();
  }, [institutions]);

  // Aggregate KPIs
  const totalInstitutions = institutions.length;
  const totalStudents = useMemo(() => {
    return institutions.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
  }, [institutions]);

  const topInstitution = useMemo(() => {
    if (institutions.length === 0) return null;
    return institutions.reduce((prev, curr) => (curr.studentCount > (prev?.studentCount || 0) ? curr : prev), institutions[0]);
  }, [institutions]);

  // Filter & Sort
  const filteredInstitutions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    const filtered = institutions.filter((inst) => {
      const matchesSearch =
        !q ||
        inst.name.toLowerCase().includes(q) ||
        (inst.abbreviation && inst.abbreviation.toLowerCase().includes(q)) ||
        (inst.domain && inst.domain.toLowerCase().includes(q));

      const matchesType =
        typeFilter === 'all' ||
        (inst.type && inst.type.toLowerCase() === typeFilter);

      return matchesSearch && matchesType;
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
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

    return filtered;
  }, [institutions, searchTerm, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredInstitutions.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedInstitutions = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredInstitutions.slice(start, start + pageSize);
  }, [filteredInstitutions, activePage, pageSize]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Institution Student Counts</h1>
          <p className="text-muted-foreground text-sm">
            Live student enrollment and verified institutional breakdown across the platform.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isPending}
          className="gap-2 self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Updating...' : 'Live Refresh'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Institutions</CardTitle>
            <Building2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalInstitutions}</div>
            <p className="text-xs text-muted-foreground mt-1">Accredited & custom colleges</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Enrolled Students</CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Students linked to institutions</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leading Institution</CardTitle>
            <GraduationCap className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground truncate">
              {topInstitution && topInstitution.studentCount > 0
                ? topInstitution.name
                : 'None yet'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {topInstitution && topInstitution.studentCount > 0
                ? `${topInstitution.studentCount} active students`
                : 'No student assignments recorded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Filters & Search Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, abbreviation, domain..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-10"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v || 'all');
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {availableTypes.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v: any) => {
            setSortBy(v || 'count_desc');
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] h-10 sm:ml-auto">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count_desc">Most Students</SelectItem>
            <SelectItem value="count_asc">Fewest Students</SelectItem>
            <SelectItem value="name_asc">Name (A – Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z – A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">Institution Name</th>
                <th className="px-6 py-4 font-semibold">Abbreviation</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Student Count</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInstitutions.map((inst) => (
                <tr
                  key={inst.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{inst.name}</span>
                      {inst.verified && (
                        <span title="Verified Institution">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    {inst.domain && (
                      <span className="text-xs text-muted-foreground block ml-6">
                        {inst.domain}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {inst.abbreviation ? (
                      <Badge variant="outline" className="font-mono text-xs font-semibold">
                        {inst.abbreviation}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {inst.type || 'institution'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge
                      variant={inst.studentCount > 0 ? 'default' : 'outline'}
                      className={`font-semibold text-sm px-3 py-1 ${
                        inst.studentCount > 0
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground bg-muted/30'
                      }`}
                    >
                      {inst.studentCount} {inst.studentCount === 1 ? 'student' : 'students'}
                    </Badge>
                  </td>
                </tr>
              ))}

              {filteredInstitutions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">No institutions match your filter</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or type filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Live Pagination */}
        {filteredInstitutions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border gap-3 text-sm text-muted-foreground">
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
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <span className="px-2 text-xs">
                Page {activePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage >= totalPages}
                className="gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
