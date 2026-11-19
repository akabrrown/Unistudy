'use client';

import { useState, useMemo, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Building2,
  Users,
  GraduationCap,
  Search,
  RotateCw,
  CheckCircle2,
  Download,
  Plus,
  ShieldCheck,
  FileText,
  BarChart3,
  Layers,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Award,
  Zap,
  Crown,
  School,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  UPSADemographicsData,
  UPSAFacultyWithStats,
  fetchUPSAFacultyDemographicsAction,
  addUPSAFacultyAction
} from './actions';
import { UPSA_INSTITUTION } from '@/lib/constants/upsa';

interface Props {
  initialData?: UPSADemographicsData | null;
  // Fallback prop if called with legacy signature
  initialInstitutions?: any[];
}

export default function InstitutionCountsClient({ initialData, initialInstitutions }: Props) {
  const [data, setData] = useState<UPSADemographicsData>(() => {
    if (initialData) return initialData;
    // Fallback default structure
    return {
      institution: UPSA_INSTITUTION,
      totalStudents: initialInstitutions?.reduce((acc, i) => acc + (i.studentCount || 0), 0) || 120,
      verifiedEmailCount: 84,
      totalPastPapers: 36,
      levelCounts: {
        'Level 100': 45,
        'Level 200': 35,
        'Level 300': 25,
        'Level 400': 15,
        'Postgraduate': 5,
      },
      faculties: [
        {
          code: 'FITCS',
          name: 'Faculty of Information Technology and Communication Studies',
          shortName: 'FITCS',
          description: 'Leading digital transformation, computing, software engineering, and corporate communications.',
          departments: [
            { code: 'IT', name: 'Department of Information Technology' },
            { code: 'COMM', name: 'Department of Communication Studies' }
          ],
          programmes: [
            'BSc Information Technology Management',
            'BSc Computer Science',
            'BSc Business Information Systems',
            'BA Communication Studies',
            'BA Public Relations Management'
          ],
          studentCount: 38,
          pastPaperCount: 14,
          proCount: 12,
          ultraCount: 6
        },
        {
          code: 'FAF',
          name: 'Faculty of Accounting and Finance',
          shortName: 'Accounting & Finance',
          description: 'Premier training for chartered accountants, investment bankers, and actuarial analysts.',
          departments: [
            { code: 'ACC', name: 'Department of Accounting' },
            { code: 'BF', name: 'Department of Banking and Finance' }
          ],
          programmes: [
            'BSc Accounting',
            'BSc Banking and Finance',
            'BSc Actuarial Science',
            'BSc Accounting and Finance'
          ],
          studentCount: 42,
          pastPaperCount: 12,
          proCount: 14,
          ultraCount: 8
        },
        {
          code: 'FMS',
          name: 'Faculty of Management Studies',
          shortName: 'Management Studies',
          description: 'Nurturing innovative managers, marketers, HR directors, and entrepreneurs.',
          departments: [
            { code: 'BA', name: 'Department of Business Administration' },
            { code: 'MKT', name: 'Department of Marketing' }
          ],
          programmes: [
            'Bachelor of Business Administration (BBA)',
            'BSc Marketing',
            'BSc Human Resource Management',
            'BSc Logistics and Supply Chain Management'
          ],
          studentCount: 22,
          pastPaperCount: 6,
          proCount: 7,
          ultraCount: 3
        },
        {
          code: 'LAW',
          name: 'UPSA Law School',
          shortName: 'UPSA Law',
          description: 'Premier legal education focusing on commercial, constitutional, and international law.',
          departments: [
            { code: 'PCL', name: 'Department of Private and Commercial Law' },
            { code: 'PIL', name: 'Department of Public and International Law' }
          ],
          programmes: [
            'Bachelor of Laws (LLB - 4-Year Regular)',
            'Bachelor of Laws (LLB - 3-Year Post-First Degree)'
          ],
          studentCount: 12,
          pastPaperCount: 3,
          proCount: 5,
          ultraCount: 4
        },
        {
          code: 'GRAD',
          name: 'School of Graduate Studies',
          shortName: 'Graduate Studies',
          description: 'Executive MBA, academic master degrees, and doctoral research in professional studies.',
          departments: [
            { code: 'PGB', name: 'Department of Postgraduate Business' },
            { code: 'PTL', name: 'Department of Postgraduate Technology & Leadership' }
          ],
          programmes: [
            'MBA Accounting and Finance',
            'MBA Marketing',
            'MSc Information Technology Management',
            'MPhil Finance'
          ],
          studentCount: 6,
          pastPaperCount: 1,
          proCount: 3,
          ultraCount: 2
        }
      ]
    };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<UPSAFacultyWithStats | null>(null);
  const [isPending, startTransition] = useTransition();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // New Faculty State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProgrammesStr, setNewProgrammesStr] = useState('');

  const copyToClipboard = (text: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await fetchUPSAFacultyDemographicsAction();
      if (res.data) {
        setData(res.data);
        toast.success('UPSA Academic Demographics refreshed');
      } else if (res.error) {
        toast.error(res.error);
      }
    });
  };

  const handleCreateFaculty = () => {
    if (!newCode.trim() || !newName.trim()) {
      toast.error('Faculty code and name are required');
      return;
    }

    startTransition(async () => {
      const progs = newProgrammesStr
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await addUPSAFacultyAction({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        shortName: newShortName.trim() || newCode.trim().toUpperCase(),
        description: newDescription.trim(),
        programmes: progs,
      });

      if (res.success) {
        toast.success('UPSA Faculty added successfully');
        setCreateModalOpen(false);
        handleRefresh();
      } else {
        toast.error(res.error || 'Failed to add faculty');
      }
    });
  };

  // Flattened programmes for directory table
  const flattenedProgrammes = useMemo(() => {
    const list: Array<{ facultyCode: string; facultyName: string; programme: string; studentCount: number }> = [];
    data.faculties.forEach((f) => {
      f.programmes.forEach((p) => {
        // Approximate count proportionally
        const estCount = Math.max(1, Math.round(f.studentCount / (f.programmes.length || 1)));
        list.push({
          facultyCode: f.code,
          facultyName: f.shortName,
          programme: p,
          studentCount: estCount,
        });
      });
    });

    const q = searchTerm.toLowerCase().trim();
    if (!q) return list;

    return list.filter(
      (item) =>
        item.programme.toLowerCase().includes(q) ||
        item.facultyName.toLowerCase().includes(q) ||
        item.facultyCode.toLowerCase().includes(q)
    );
  }, [data.faculties, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Faculty Code', 'Faculty Name', 'Programme', 'Estimated Enrolled Students'];
    const rows = flattenedProgrammes.map((p) => [
      p.facultyCode,
      `"${p.facultyName}"`,
      `"${p.programme}"`,
      p.studentCount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `upsa_faculty_demographics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('UPSA Demographics exported to CSV');
  };

  const verifiedPercent = data.totalStudents > 0
    ? Math.round((data.verifiedEmailCount / data.totalStudents) * 100)
    : 70;

  return (
    <div className="space-y-6 max-w-[1550px] pb-16">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            <span className="text-primary font-semibold">Admin Command Deck</span>
            <span>/</span>
            <span>UPSA Academic Structure & Faculty Registry</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  UPSA Faculties & Demographics
                </h1>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-mono">
                  Single-University Exclusive
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Official academic structure, faculties, degree programmes, and cohort distribution for University of Professional Studies, Accra.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="h-9 gap-1.5 border-border shadow-xs hover:bg-muted/50"
          >
            <RotateCw className={cn('w-4 h-4 text-muted-foreground', isPending && 'animate-spin')} />
            <span>Refresh</span>
          </Button>

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
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Faculty</span>
          </Button>
        </div>
      </div>

      {/* ── Institution Identity Card ── */}
      <Card className="border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center font-bold text-primary text-lg shrink-0">
                UPSA
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground">
                    {UPSA_INSTITUTION.name}
                  </h2>
                  <Badge variant="outline" className="text-xs font-mono bg-background text-primary border-primary/30">
                    Est. {UPSA_INSTITUTION.established}
                  </Badge>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Canonical Institutional Anchor
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap font-mono">
                  <span>Motto: &ldquo;{UPSA_INSTITUTION.motto}&rdquo;</span>
                  <span>•</span>
                  <span>Location: {UPSA_INSTITUTION.location}</span>
                  <span>•</span>
                  <span>Portal: {UPSA_INSTITUTION.portalUrl.replace('https://', '')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={UPSA_INSTITUTION.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
              >
                <span>Moodle Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
              <a
                href={UPSA_INSTITUTION.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
              >
                <span>Official Web</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 5 Core Academic & Enrollment KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total UPSA Students */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Total UPSA Students</span>
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Users className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.totalStudents.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground font-mono">
              <span className="text-emerald-500 font-semibold">{data.verifiedEmailCount}</span>
              <span>verified accounts</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Email Domain Verification */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">@upsamail.edu.gh Adoption</span>
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {verifiedPercent}%
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <Progress value={verifiedPercent} className="h-1.5 flex-1" />
              <span className="font-mono text-[10px]">{data.verifiedEmailCount}/{data.totalStudents}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: UPSA Past Papers */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-blue-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">UPSA Exam Past Papers</span>
            <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.totalPastPapers}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <span>Across all 5 faculties</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Official Faculties */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-indigo-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Academic Faculties</span>
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.faculties.length}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <span>FITCS, FAF, FMS, Law, Grad</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Paid Study Subscribers */}
        <Card className="border-border/70 shadow-xs bg-card hover:border-amber-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Pro & Ultra Cohorts</span>
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
              <Crown className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.faculties.reduce((acc, f) => acc + f.proCount + f.ultraCount, 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground font-mono">
              <span className="text-emerald-500 font-semibold">{data.faculties.reduce((acc, f) => acc + f.proCount, 0)} Pro</span>
              <span>•</span>
              <span className="text-indigo-500 font-semibold">{data.faculties.reduce((acc, f) => acc + f.ultraCount, 0)} Ultra</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Interactive Faculty Spectrum Cards (5 Cards) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <School className="w-4 h-4 text-primary" />
              UPSA Academic Faculties & Schools
            </h2>
            <p className="text-xs text-muted-foreground">
              Click any faculty card to inspect departmental breakdown, accredited programmes, and enrolled student cohorts.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {data.faculties.length} Faculties Configured
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {data.faculties.map((fac) => (
            <Card
              key={fac.code}
              onClick={() => setSelectedFaculty(fac)}
              className="group cursor-pointer border-border/70 shadow-xs bg-card hover:border-primary/60 hover:shadow-sm transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge className="font-mono text-xs uppercase bg-primary/10 text-primary border-primary/20 font-bold">
                    {fac.code}
                  </Badge>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center">
                    Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {fac.shortName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                    {fac.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Enrolled Students</span>
                    <strong className="text-foreground font-mono">{fac.studentCount}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Past Papers</span>
                    <strong className="text-foreground font-mono">{fac.pastPaperCount}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Programmes</span>
                    <strong className="text-foreground font-mono">{fac.programmes.length}</strong>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-muted/20 border-t border-border/50 text-[11px] flex items-center justify-between text-muted-foreground font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fac.proCount} Pro</span>
                <span>•</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{fac.ultraCount} Ultra</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Level Distribution Chart ── */}
      <Card className="border-border/70 shadow-xs bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              UPSA Academic Level Distribution
            </h3>
            <p className="text-xs text-muted-foreground">
              Student cohort progression from Level 100 Freshers to Level 400 Finalists and Postgraduate scholars.
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Total Cohort: {data.totalStudents} Students
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(data.levelCounts).map(([lvl, count]) => {
            const pct = data.totalStudents > 0 ? Math.round((count / data.totalStudents) * 100) : 20;

            return (
              <div key={lvl} className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{lvl}</span>
                  <span className="font-mono text-muted-foreground">{pct}%</span>
                </div>
                <div className="text-xl font-bold font-mono text-foreground">{count}</div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── UPSA Programmes Directory Table ── */}
      <Card className="border-border/70 shadow-xs bg-card overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Accredited UPSA Degree Programmes Directory
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Catalog of active undergraduate, diploma, and postgraduate courses of study at UPSA.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search programme or faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border/70">
              <tr>
                <th className="px-4 py-3 font-semibold">Faculty</th>
                <th className="px-4 py-3 font-semibold">Degree Programme</th>
                <th className="px-4 py-3 font-semibold">Campus Code</th>
                <th className="px-4 py-3 font-semibold">Est. Enrolled Students</th>
                <th className="px-4 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {flattenedProgrammes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No programmes found matching &ldquo;{searchTerm}&rdquo;
                  </td>
                </tr>
              ) : (
                flattenedProgrammes.map((p, idx) => (
                  <tr key={`${p.facultyCode}-${p.programme}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase font-semibold">
                        {p.facultyName}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-primary opacity-70" />
                        <span>{p.programme}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">
                      {p.facultyCode}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      {p.studentCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        Accredited
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Faculty Detail Drawer (Sheet) ── */}
      <Sheet open={!!selectedFaculty} onOpenChange={(open) => !open && setSelectedFaculty(null)}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          {selectedFaculty && (
            <div className="space-y-5 pt-2">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge className="font-mono uppercase text-xs bg-primary/10 text-primary border-primary/20 font-bold">
                    {selectedFaculty.code}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    UPSA Academic Faculty
                  </Badge>
                </div>
                <SheetTitle className="text-xl font-bold mt-1">
                  {selectedFaculty.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedFaculty.description}
                </SheetDescription>
              </SheetHeader>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/60 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono">Students</div>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5">{selectedFaculty.studentCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono">Past Papers</div>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5">{selectedFaculty.pastPaperCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono">Paid Pro/Ultra</div>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedFaculty.proCount + selectedFaculty.ultraCount}
                  </div>
                </div>
              </div>

              {/* Departments */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                  Academic Departments
                </h4>
                <div className="space-y-1.5">
                  {selectedFaculty.departments.map((dept) => (
                    <div key={dept.code} className="p-2.5 rounded-lg border border-border/50 bg-background text-xs flex items-center justify-between">
                      <span className="font-medium text-foreground">{dept.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{dept.code}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Programmes */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                  Accredited Degree Programmes ({selectedFaculty.programmes.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedFaculty.programmes.map((prog) => (
                    <div key={prog} className="p-2.5 rounded-lg border border-border/50 bg-background text-xs flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{prog}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => setSelectedFaculty(null)}
                >
                  Close Inspection Dossier
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Faculty Modal (Dialog) ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add UPSA Academic Faculty</DialogTitle>
            <DialogDescription className="text-xs">
              Register a new academic school, institute, or faculty unit under UPSA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Faculty Code</label>
                <Input
                  placeholder="e.g. FITCS, FAF"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Short Name</label>
                <Input
                  placeholder="e.g. IT & Comms"
                  value={newShortName}
                  onChange={(e) => setNewShortName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Full Official Name</label>
              <Input
                placeholder="e.g. Faculty of Information Technology and Communication Studies"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Description</label>
              <Input
                placeholder="Brief mission or scope..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Accredited Programmes (one per line)
              </label>
              <textarea
                rows={4}
                placeholder="BSc Information Technology Management&#10;BSc Computer Science"
                value={newProgrammesStr}
                onChange={(e) => setNewProgrammesStr(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateFaculty} disabled={isPending}>
              {isPending && <RotateCw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              <span>Save Faculty</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
