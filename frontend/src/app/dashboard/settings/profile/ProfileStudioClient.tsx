'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  User as UserIcon,
  GraduationCap,
  Award,
  Brain,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  FileText,
  Layers,
  Coins,
  Download,
  Copy,
  Check,
  RefreshCw,
  Accessibility,
  CreditCard,
  Bot,
  Eye,
  Headphones,
  PenTool,
  Compass,
  Trophy,
  Target,
  Moon,
  Star,
  Building2,
  Mail,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AvatarEditor } from './AvatarEditor';
import { AcademicSettingsForm } from './AcademicSettingsForm';

export interface ProfileRecord {
  id: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  institution_id?: string | null;
  degree_programme?: string | null;
  year_of_study?: number | null;
  study_goal?: string | null;
  learning_style?: string | null;
  tutor_name?: string | null;
  tutor_personality?: 'encouraging' | 'strict' | 'funny' | 'neutral' | null;
  reading_level?: number | null;
  tone_preference?: 'academic' | 'casual' | null;
  created_at?: string | null;
}

export interface ScholarStats {
  coursesCount: number;
  lecturesCount: number;
  quizCount: number;
  quizAvgScore: number;
  perfectQuizCount: number;
  flashcardReps: number;
  pastPapersCount: number;
  walletBalance: number;
}

interface VarkQuestion {
  id: number;
  q: string;
  options: { a: string; style: string }[];
}

type StudioTab = 'dossier' | 'pedagogy' | 'achievements' | 'security';

const LEARNING_STYLE_META: Record<
  string,
  {
    label: string;
    tagline: string;
    description: string;
    icon: React.ElementType;
    color: string;
  }
> = {
  visual: {
    label: 'Visual Spatial Learner',
    tagline: 'Diagrams, flowcharts, and structural mapping',
    description:
      'Your AI Tutor prioritizes concept maps, spatial analogies, and structured visual tables when explaining complex slides.',
    icon: Eye,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/25',
  },
  auditory: {
    label: 'Auditory Verbal Learner',
    tagline: 'Spoken walkthroughs, Socratic dialogue, and rhythm',
    description:
      'Your AI Tutor emphasizes conversational step-by-step reasoning, mnemonic cadence, and verbalized derivations.',
    icon: Headphones,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25',
  },
  reading_writing: {
    label: 'Reading / Writing Scholar',
    tagline: 'Formal definitions, structured prose, and Cornell notes',
    description:
      'Your AI Tutor structures explanations as rigorous textbook-grade outlines, theorem statements, and precise definitions.',
    icon: PenTool,
    color: 'text-primary bg-primary/10 border-primary/25',
  },
  kinaesthetic: {
    label: 'Kinaesthetic Applied Learner',
    tagline: 'Worked problems, simulations, and real-world applications',
    description:
      'Your AI Tutor leads with concrete worked examples, numerical boundary cases, and interactive practice problems.',
    icon: Compass,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
  },
};

export function ProfileStudioClient({
  initialProfile,
  institutionName,
  institutionAbbr,
  stats,
  initialEarnedBadges,
}: {
  initialProfile: ProfileRecord;
  institutionName: string;
  institutionAbbr?: string | null;
  stats: ScholarStats;
  initialEarnedBadges: string[];
}) {
  const [activeTab, setActiveTab] = useState<StudioTab>('dossier');
  const [profile, setProfile] = useState<ProfileRecord>(initialProfile);
  const [earnedBadges, setEarnedBadges] = useState<string[]>(initialEarnedBadges);
  const [syncingBadges, setSyncingBadges] = useState(false);

  // AI Tutor Pedagogy Preferences State
  const [tutorName, setTutorName] = useState(initialProfile.tutor_name || 'Uni');
  const [tutorPersonality, setTutorPersonality] = useState<
    'encouraging' | 'strict' | 'funny' | 'neutral'
  >(initialProfile.tutor_personality || 'encouraging');
  const [readingLevel, setReadingLevel] = useState<number>(initialProfile.reading_level || 3);
  const [tonePreference, setTonePreference] = useState<'academic' | 'casual'>(
    initialProfile.tone_preference || 'academic'
  );
  const [savingPedagogy, setSavingPedagogy] = useState(false);

  // VARK Diagnostic State
  const [varkQuestions, setVarkQuestions] = useState<VarkQuestion[]>([]);
  const [varkAnswers, setVarkAnswers] = useState<Record<string, string>>({});
  const [varkCounts, setVarkCounts] = useState<Record<string, number> | null>(null);
  const [submittingVark, setSubmittingVark] = useState(false);

  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/profile/personality')
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((data: { questions?: VarkQuestion[] }) => {
        if (active && Array.isArray(data.questions)) {
          setVarkQuestions(data.questions);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Completeness checklist calculation
  const completeness = useMemo(() => {
    const items = [
      { label: 'Full Name', done: Boolean(profile.full_name?.trim()) },
      { label: 'Scholar Handle (@username)', done: Boolean(profile.username?.trim()) },
      { label: 'Profile Avatar / Monogram', done: Boolean(profile.avatar_url?.trim()) },
      {
        label: 'University Institution',
        done: Boolean(institutionName && institutionName !== 'Not provided'),
      },
      { label: 'Degree Programme', done: Boolean(profile.degree_programme?.trim()) },
      { label: 'Academic Level (Year)', done: Boolean(profile.year_of_study) },
      { label: 'Semester Study Goal', done: Boolean(profile.study_goal?.trim()) },
      { label: 'VARK Learning Modality', done: Boolean(profile.learning_style) },
    ];
    const completedCount = items.filter((i) => i.done).length;
    const pct = Math.round((completedCount / items.length) * 100);
    return { items, completedCount, total: items.length, pct };
  }, [profile, institutionName]);

  // Academic Milestone Badges Catalog with live progress
  const badgeCatalog = useMemo(
    () => [
      {
        id: 'quiz_10',
        name: 'Quiz Rookie',
        description: 'Complete 10 course comprehension quizzes',
        icon: FileText,
        current: stats.quizCount,
        target: 10,
        unit: 'quizzes',
      },
      {
        id: 'quiz_100',
        name: 'Quiz Champion',
        description: 'Complete 100 cumulative course quizzes',
        icon: Trophy,
        current: stats.quizCount,
        target: 100,
        unit: 'quizzes',
      },
      {
        id: 'perfect',
        name: 'Perfectionist',
        description: 'Score 100% accuracy on any course quiz',
        icon: Target,
        current: stats.perfectQuizCount > 0 ? 1 : 0,
        target: 1,
        unit: 'perfect score',
      },
      {
        id: 'fc_100',
        name: 'Card Shark',
        description: 'Complete 100 spaced-repetition flashcard reviews',
        icon: Layers,
        current: stats.flashcardReps,
        target: 100,
        unit: 'reviews',
      },
      {
        id: 'fc_1000',
        name: 'Memory Master',
        description: 'Complete 1,000 spaced-repetition flashcard reviews',
        icon: Brain,
        current: stats.flashcardReps,
        target: 1000,
        unit: 'reviews',
      },
      {
        id: 'paper_5',
        name: 'Exam Veteran',
        description: 'Complete 5 timed past-paper examination simulations',
        icon: Award,
        current: stats.pastPapersCount,
        target: 5,
        unit: 'papers',
      },
      {
        id: 'all_courses',
        name: 'Polymath Scholar',
        description: 'Enroll and study across 5 or more university courses',
        icon: Star,
        current: stats.coursesCount,
        target: 5,
        unit: 'courses',
      },
      {
        id: 'night_owl',
        name: 'Late-Night Researcher',
        description: 'Log a deep study session after 11:00 PM',
        icon: Moon,
        current: earnedBadges.includes('night_owl') ? 1 : 0,
        target: 1,
        unit: 'session',
      },
    ],
    [stats, earnedBadges]
  );

  const handleSavePedagogy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPedagogy(true);
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutor_name: tutorName.trim() || 'Uni',
          tutor_personality: tutorPersonality,
          reading_level: readingLevel,
          tone_preference: tonePreference,
        }),
      });
      if (!res.ok) throw new Error('Failed to save AI Tutor pedagogy preferences');
      setProfile((prev) => ({
        ...prev,
        tutor_name: tutorName.trim() || 'Uni',
        tutor_personality: tutorPersonality,
        reading_level: readingLevel,
        tone_preference: tonePreference,
      }));
      toast.success('AI Tutor pedagogy calibrated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSavingPedagogy(false);
    }
  };

  const handleSubmitVark = async () => {
    if (Object.keys(varkAnswers).length < varkQuestions.length) {
      toast.error('Please answer all 5 diagnostic questions to compute your learning modality.');
      return;
    }
    setSubmittingVark(true);
    try {
      const res = await fetch('/api/profile/personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: varkAnswers }),
      });
      const data = (await res.json()) as {
        style?: string;
        counts?: Record<string, number>;
        error?: string;
      };
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Could not compute VARK profile');
      }
      if (data.style) {
        setProfile((prev) => ({ ...prev, learning_style: data.style || null }));
      }
      if (data.counts) {
        setVarkCounts(data.counts);
      }
      toast.success('Learning modality calibrated and saved to your AI Tutor');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit diagnostic');
    } finally {
      setSubmittingVark(false);
    }
  };

  const handleSyncBadges = async () => {
    setSyncingBadges(true);
    try {
      const res = await fetch('/api/profile/badges/check', { method: 'POST' });
      const data = (await res.json()) as { newBadges?: string[] };
      if (!res.ok) throw new Error('Could not verify badges');
      const newlyUnlocked = Array.isArray(data.newBadges) ? data.newBadges : [];
      if (newlyUnlocked.length > 0) {
        setEarnedBadges((prev) => Array.from(new Set([...prev, ...newlyUnlocked])));
        toast.success(`Unlocked ${newlyUnlocked.length} new academic badge(s)!`);
      } else {
        toast.success('All milestone badges are up to date');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync badges');
    } finally {
      setSyncingBadges(false);
    }
  };

  const handleExportDossier = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      scholarIdentity: {
        id: profile.id,
        fullName: profile.full_name,
        username: profile.username,
        email: profile.email,
        institution: institutionName,
        degreeProgramme: profile.degree_programme,
        yearOfStudy: profile.year_of_study,
        studyGoal: profile.study_goal,
      },
      aiPedagogyCalibration: {
        tutorName,
        tutorPersonality,
        readingLevel,
        tonePreference,
        learningStyle: profile.learning_style,
      },
      empiricalMetrics: stats,
      unlockedBadges: earnedBadges,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unistudy-scholar-dossier-${profile.username || 'profile'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported Scholar Dossier JSON');
  };

  const handleCopyScholarId = async () => {
    const handleText = profile.username ? `@${profile.username}` : profile.id;
    await navigator.clipboard.writeText(handleText);
    setCopiedId(true);
    toast.success(`Copied ${handleText} to clipboard`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const currentLearningStyleMeta = profile.learning_style
    ? LEARNING_STYLE_META[profile.learning_style]
    : null;

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Studio Header & Settings Switcher */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono uppercase tracking-wider">
            <UserIcon className="w-3.5 h-3.5" />
            Academic Identity · AI Pedagogy · Scholar Dossier
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Scholar Profile &amp; Academic Dossier
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Manage your university credentials, calibrate your Mr. Ranedeer AI Tutor persona and VARK
            cognitive modality, and track verified academic milestones.
          </p>
        </div>

        {/* Settings Suite Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <Link
              href="/dashboard/settings/profile"
              className="inline-flex items-center gap-1.5 rounded-lg bg-background text-foreground shadow-xs px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-primary" />
              Profile
            </Link>
            <Link
              href="/dashboard/settings/accessibility"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Accessibility className="w-3.5 h-3.5" />
              Accessibility
            </Link>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Billing
            </Link>
          </div>

          <button
            type="button"
            onClick={handleExportDossier}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            Export Dossier
          </button>
        </div>
      </header>

      {/* 4-Tile Scholar Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Enrolled Syllabus
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {stats.coursesCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">courses</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.lecturesCount} lecture decks indexed
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Quiz Mastery
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {stats.quizCount > 0 ? `${stats.quizAvgScore}%` : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.quizCount} attempts · {stats.perfectQuizCount} perfect 100%
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Target className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Retention &amp; Exams
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {stats.flashcardReps.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">reviews</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.pastPapersCount} timed past papers completed
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Badges &amp; Wallet
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {earnedBadges.length}/{badgeCatalog.length}{' '}
              <span className="text-xs font-normal text-muted-foreground">badges</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.walletBalance.toLocaleString()} AI compute credits
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Studio Mode Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
          {(
            [
              { id: 'dossier', label: 'Identity & Academic Dossier', icon: GraduationCap },
              { id: 'pedagogy', label: 'AI Tutor & VARK Modality', icon: Brain },
              {
                id: 'achievements',
                label: `Milestone Badges (${earnedBadges.length}/${badgeCatalog.length})`,
                icon: Trophy,
              },
              { id: 'security', label: 'Credentials & Portability', icon: ShieldCheck },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5 text-primary" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>Dossier Completeness:</span>
          <span className="font-bold text-primary">{completeness.pct}%</span>
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completeness.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* TAB 1: IDENTITY & ACADEMIC DOSSIER */}
      {activeTab === 'dossier' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Avatar & Academic Settings Form */}
          <div className="lg:col-span-8 rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Personal &amp; University Credentials
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure your academic identity, verified university affiliation, degree programme,
                and semester objective.
              </p>
            </div>

            <AvatarEditor
              initialUrl={profile.avatar_url}
              initialName={profile.full_name || profile.username}
              onAvatarChanged={(newUrl) =>
                setProfile((prev) => ({ ...prev, avatar_url: newUrl }))
              }
            />

            <AcademicSettingsForm
              initialFullName={profile.full_name}
              initialUsername={profile.username}
              initialYear={profile.year_of_study || 1}
              initialDegree={profile.degree_programme || null}
              institutionName={institutionName}
              initialStudyGoal={profile.study_goal}
              onSaved={(updated) =>
                setProfile((prev) => ({
                  ...prev,
                  full_name: updated.full_name,
                  username: updated.username,
                  year_of_study: updated.year_of_study,
                  degree_programme: updated.degree_programme,
                  study_goal: updated.study_goal,
                }))
              }
            />
          </div>

          {/* Right 4 Cols: Live Scholar ID Card & Completeness Checklist */}
          <div className="lg:col-span-4 space-y-5">
            {/* Live University Scholar ID Card */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
              <div className="bg-primary/10 border-b border-primary/20 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                    {institutionAbbr || 'UNISTUDY SCHOLAR ID'}
                  </span>
                </div>
                <span className="rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                  Active Standing
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3.5">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Scholar'}
                      className="w-14 h-14 rounded-2xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xl font-bold font-mono shrink-0">
                      {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {profile.full_name || 'Unnamed Scholar'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-primary font-semibold truncate">
                        @{profile.username || 'set_handle'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopyScholarId()}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Copy handle"
                      >
                        {copiedId ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-border/60 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Institution
                    </span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[190px]">
                      {institutionName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Programme
                    </span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[190px]">
                      {profile.degree_programme || 'Not specified'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Academic Year
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      Year {profile.year_of_study || 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Verified Email
                    </span>
                    <span className="font-mono text-muted-foreground truncate max-w-[190px]">
                      {profile.email || 'Authenticated'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" />
                      Cognitive Modality
                    </span>
                    <span className="font-mono font-semibold text-primary capitalize">
                      {profile.learning_style
                        ? profile.learning_style.replace('_', '/')
                        : 'Uncalibrated'}
                    </span>
                  </div>
                </div>

                {profile.study_goal && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-semibold flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Active Semester Objective
                    </span>
                    <p className="text-xs font-medium text-foreground leading-relaxed">
                      {profile.study_goal}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Completeness Audit */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Dossier Readiness Audit</h3>
                <span className="text-xs font-mono font-bold text-primary">
                  {completeness.completedCount}/{completeness.total}
                </span>
              </div>

              <div className="space-y-1.5">
                {completeness.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0"
                  >
                    <span
                      className={cn(
                        item.done ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                        Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: AI TUTOR PEDAGOGY & VARK MODALITY DIAGNOSTIC */}
      {activeTab === 'pedagogy' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 6 Cols: Mr. Ranedeer AI Tutor Pedagogy Configurator */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  AI Tutor Pedagogy Calibration
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure how your lecture AI Tutor structures explanations, `/test` practice
                  drills, and `/plan` prerequisite roadmaps.
                </p>
              </div>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary shrink-0">
                Mr. Ranedeer Spec
              </span>
            </div>

            <form onSubmit={(e) => void handleSavePedagogy(e)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  AI Tutor Designation / Name
                </label>
                <input
                  type="text"
                  value={tutorName}
                  onChange={(e) => setTutorName(e.target.value)}
                  maxLength={30}
                  placeholder="e.g. Uni, Prof. Euler, Athena"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Pedagogical Demeanor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: 'encouraging',
                        label: 'Encouraging Mentor',
                        desc: 'Supportive scaffolding with positive reinforcement',
                      },
                      {
                        id: 'strict',
                        label: 'Rigorous Examiner',
                        desc: 'High-bar precision focused on formal proofs & grading criteria',
                      },
                      {
                        id: 'neutral',
                        label: 'Objective Analyst',
                        desc: 'Direct, textbook-grade derivations with zero filler',
                      },
                      {
                        id: 'funny',
                        label: 'Witty Lecturer',
                        desc: 'Memorable analogies and dry academic wit',
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTutorPersonality(item.id)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all cursor-pointer',
                        tutorPersonality === item.id
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : 'border-border bg-muted/20 hover:bg-muted/40'
                      )}
                    >
                      <div className="text-xs font-bold text-foreground">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Explanation Depth Tier (1–5)
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
                    Tier {readingLevel} / 5
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { lvl: 1, label: 'Intuitive' },
                    { lvl: 2, label: 'Foundation' },
                    { lvl: 3, label: 'Undergrad' },
                    { lvl: 4, label: 'Honours' },
                    { lvl: 5, label: 'Postgrad' },
                  ].map((item) => (
                    <button
                      key={item.lvl}
                      type="button"
                      onClick={() => setReadingLevel(item.lvl)}
                      className={cn(
                        'rounded-xl border py-2 px-1 text-center transition-colors cursor-pointer',
                        readingLevel === item.lvl
                          ? 'border-primary bg-primary text-primary-foreground font-bold'
                          : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="text-xs font-mono">{item.lvl}</div>
                      <div className="text-[10px] truncate">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Discourse Register
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'academic', label: 'Formal Academic Register' },
                      { id: 'casual', label: 'Conversational Study Partner' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTonePreference(t.id)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer',
                        tonePreference === t.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <Link
                  href="/dashboard/settings/accessibility"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Open Full Accessibility &amp; Font Suite
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="submit"
                  disabled={savingPedagogy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {savingPedagogy ? 'Saving...' : 'Save AI Pedagogy'}
                </button>
              </div>
            </form>
          </div>

          {/* Right 6 Cols: Interactive VARK Cognitive Modality Diagnostic */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4 text-emerald-500" />
                  VARK Cognitive Learning Diagnostic
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Answer 5 rapid study-preference scenarios to calibrate your primary cognitive
                  modality (Visual, Auditory, Reading/Writing, or Kinaesthetic).
                </p>
              </div>
              {currentLearningStyleMeta && (
                <span
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[11px] font-mono font-bold shrink-0',
                    currentLearningStyleMeta.color
                  )}
                >
                  {currentLearningStyleMeta.label}
                </span>
              )}
            </div>

            {currentLearningStyleMeta && (
              <div
                className={cn(
                  'rounded-xl border p-3.5 flex items-start gap-3',
                  currentLearningStyleMeta.color
                )}
              >
                <currentLearningStyleMeta.icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    Active Profile: {currentLearningStyleMeta.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentLearningStyleMeta.description}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {varkQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-2.5"
                >
                  <p className="text-xs font-bold text-foreground">
                    <span className="font-mono text-primary mr-1.5">Q{idx + 1}.</span>
                    {q.q}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options.map((opt) => {
                      const selected = varkAnswers[String(q.id)] === opt.style;
                      return (
                        <button
                          key={opt.style}
                          type="button"
                          onClick={() =>
                            setVarkAnswers((prev) => ({ ...prev, [String(q.id)]: opt.style }))
                          }
                          className={cn(
                            'rounded-lg border px-2.5 py-2 text-left text-xs transition-colors cursor-pointer',
                            selected
                              ? 'border-primary bg-primary/15 text-foreground font-semibold'
                              : 'border-border bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {opt.a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {varkCounts && (
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Modality Breakdown
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['visual', 'auditory', 'reading_writing', 'kinaesthetic'] as const).map(
                    (mod) => (
                      <div
                        key={mod}
                        className="rounded-lg border border-border bg-background p-2 text-center"
                      >
                        <div className="text-sm font-bold font-mono text-foreground">
                          {varkCounts[mod] || 0}/5
                        </div>
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {mod.replace('_', '/')}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-xs font-mono text-muted-foreground">
                {Object.keys(varkAnswers).length}/{varkQuestions.length || 5} scenarios answered
              </span>
              <button
                type="button"
                onClick={() => void handleSubmitVark()}
                disabled={submittingVark}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {submittingVark ? 'Calibrating...' : 'Compute & Save Modality'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: ACADEMIC MILESTONES & BADGES VAULT */}
      {activeTab === 'achievements' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Verified Academic Milestone Vault
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Badges are automatically verified against your quiz attempts, spaced-repetition
                flashcard reviews, and completed past-paper simulations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSyncBadges()}
              disabled={syncingBadges}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncingBadges && 'animate-spin')} />
              {syncingBadges ? 'Verifying Milestones...' : 'Verify & Sync Badges'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {badgeCatalog.map((badge) => {
              const Icon = badge.icon;
              const isUnlocked =
                earnedBadges.includes(badge.id) || badge.current >= badge.target;
              const progressPct = Math.min(
                100,
                Math.round((badge.current / Math.max(1, badge.target)) * 100)
              );

              return (
                <div
                  key={badge.id}
                  className={cn(
                    'rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all',
                    isUnlocked
                      ? 'border-emerald-500/40 bg-emerald-500/5 shadow-xs'
                      : 'border-border/80 bg-card opacity-85'
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl border flex items-center justify-center',
                          isUnlocked
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                            : 'bg-muted/40 border-border text-muted-foreground'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase',
                          isUnlocked
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isUnlocked ? 'Unlocked' : 'In Progress'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-foreground">{badge.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-muted-foreground">
                        {Math.min(badge.current, badge.target)} / {badge.target} {badge.unit}
                      </span>
                      <span
                        className={cn(
                          'font-bold',
                          isUnlocked ? 'text-emerald-500' : 'text-foreground'
                        )}
                      >
                        {progressPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isUnlocked ? 'bg-emerald-500' : 'bg-primary'
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 4: CREDENTIALS, SECURITY & PORTABILITY */}
      {activeTab === 'security' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Session &amp; Row-Level Security Status
                </h2>
                <p className="text-xs text-muted-foreground">
                  Supabase GoTrue JWT authentication with strict per-record RLS isolation.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between">
                <span className="text-muted-foreground">Account UUID</span>
                <span className="font-mono text-foreground">{profile.id}</span>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between">
                <span className="text-muted-foreground">Primary Authentication Email</span>
                <span className="font-mono text-foreground">{profile.email || 'Verified'}</span>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between">
                <span className="text-muted-foreground">Access Role</span>
                <span className="font-mono uppercase font-bold text-primary">
                  {profile.role || 'student'}
                </span>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between">
                <span className="text-muted-foreground">Wallet Credit Balance</span>
                <Link
                  href="/dashboard/settings/billing"
                  className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" />
                  {stats.walletBalance.toLocaleString()} credits
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Scholar Data Portability (JSON Export)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Download a complete machine-readable snapshot of your academic profile, AI
                    pedagogy calibration, and milestone records.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Included in Export Archive:</p>
                <p>• Institutional credentials, handle, degree programme, and semester study goal</p>
                <p>• Mr. Ranedeer AI Tutor persona, reading depth tier, and VARK learning style</p>
                <p>• Cumulative quiz accuracy, flashcard repetitions, and unlocked badges</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
              >
                Reset Account Password
              </Link>

              <button
                type="button"
                onClick={handleExportDossier}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Scholar Dossier (.JSON)
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

