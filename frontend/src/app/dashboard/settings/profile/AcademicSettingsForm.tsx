'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Search,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  AtSign,
  Target,
  Calendar,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateAcademicProfile } from '@/app/actions/profile';
import { InstitutionSelect } from '@/app/(auth)/onboarding/components/InstitutionSelect';
import { cn } from '@/lib/utils';

export interface AcademicSettingsFormProps {
  initialFullName?: string | null;
  initialUsername?: string | null;
  initialYear: number | null;
  initialDegree: string | null;
  institutionName: string | null;
  initialStudyGoal?: string | null;
  onSaved?: (updated: {
    full_name: string;
    username: string;
    year_of_study: number | null;
    degree_programme: string;
    study_goal: string;
  }) => void;
}

const STUDY_GOAL_PRESETS = [
  'First Class Honours (GPA ≥ 3.60)',
  'Dean’s List & Top 10% Cohort Standing',
  '90%+ Mastery Across Core STEM Modules',
  'Zero Last-Minute Cramming via Daily Spaced Repetition',
];

export function AcademicSettingsForm({
  initialFullName,
  initialUsername,
  initialYear,
  initialDegree,
  institutionName,
  initialStudyGoal,
  onSaved,
}: AcademicSettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(initialFullName || '');
  const [username, setUsername] = useState(initialUsername || '');
  const [yearOfStudy, setYearOfStudy] = useState<number>(initialYear || 1);
  const [degreeProgramme, setDegreeProgramme] = useState(initialDegree || '');
  const [studyGoal, setStudyGoal] = useState(initialStudyGoal || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([]);

  // Username availability state
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>(
    'idle'
  );
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const filteredProgrammes = programmes.filter((prog) =>
    prog.name.toLowerCase().includes(degreeProgramme.toLowerCase())
  );

  useEffect(() => {
    let active = true;
    async function fetchProgrammes() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('course_programmes').select('id, name').order('name');
      if (active && data) {
        setProgrammes(data);
      }
    }
    void fetchProgrammes();
    return () => {
      active = false;
    };
  }, []);

  const handleCheckUsername = async (candidateRaw: string) => {
    const cleaned = candidateRaw.trim().replace(/^@/, '').toLowerCase();
    setUsername(cleaned);
    if (!cleaned || cleaned === (initialUsername || '').toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(cleaned)) {
      setUsernameStatus('invalid');
      setUsernameSuggestions([]);
      return;
    }

    setCheckingUsername(true);
    try {
      const res = await fetch(
        `/api/profile/check-username?username=${encodeURIComponent(cleaned)}`
      );
      const data = (await res.json()) as {
        available?: boolean;
        suggestions?: string[];
      };
      if (data.available) {
        setUsernameStatus('available');
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus('taken');
        setUsernameSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      }
    } catch {
      setUsernameStatus('idle');
    } finally {
      setCheckingUsername(false);
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (usernameStatus === 'invalid') {
      toast.error('Please enter a valid username (3–30 lowercase letters, numbers, or underscores).');
      return;
    }
    if (usernameStatus === 'taken') {
      toast.error('That username is already taken. Choose one of the available suggestions.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const instId = (formData.get('institution_id') as string) || '';

      const res = await updateAcademicProfile({
        full_name: fullName,
        username: username || undefined,
        year_of_study: yearOfStudy,
        degree_programme: degreeProgramme,
        institution_id: instId || undefined,
        study_goal: studyGoal,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Scholar identity & academic dossier saved');
        setUsernameStatus('idle');
        onSaved?.({
          full_name: fullName,
          username,
          year_of_study: yearOfStudy,
          degree_programme: degreeProgramme,
          study_goal: studyGoal,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      {/* Row 1: Full Name & Username Handle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="full-name-input"
            className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5 text-primary" />
            Full Legal / Academic Name
          </label>
          <input
            id="full-name-input"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Kwame Mensah"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="username-input"
              className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
            >
              <AtSign className="w-3.5 h-3.5 text-primary" />
              Scholar Handle
            </label>
            {checkingUsername && (
              <span className="text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
              </span>
            )}
            {!checkingUsername && usernameStatus === 'available' && (
              <span className="text-[11px] font-mono text-emerald-500 inline-flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                @{username} is available
              </span>
            )}
            {!checkingUsername && usernameStatus === 'taken' && (
              <span className="text-[11px] font-mono text-amber-500 inline-flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3 h-3" />
                Already taken
              </span>
            )}
            {!checkingUsername && usernameStatus === 'invalid' && (
              <span className="text-[11px] font-mono text-red-500 inline-flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3 h-3" />
                3–30 chars (a-z, 0-9, _)
              </span>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
              @
            </span>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => void handleCheckUsername(e.target.value)}
              placeholder="scholar_handle"
              className="w-full rounded-xl border border-border bg-background pl-8 pr-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {usernameStatus === 'taken' && usernameSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-muted-foreground">Try:</span>
              {usernameSuggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => void handleCheckUsername(sug)}
                  className="rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 text-[11px] font-mono text-primary font-semibold cursor-pointer"
                >
                  @{sug}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: University Institution Selector */}
      <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5">
        <InstitutionSelect initialInstitution={institutionName} />
      </div>

      {/* Row 3: Degree Programme & Year of Study */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-1.5 relative">
          <label
            htmlFor="degree"
            className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
            Degree Programme / Major
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="degree"
              type="text"
              placeholder="e.g. BSc Computer Science & Engineering"
              className="w-full rounded-xl border border-border bg-background pl-10 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={degreeProgramme}
              onChange={(e) => {
                setDegreeProgramme(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsDropdownOpen(false), 200);
              }}
              required
            />
          </div>

          {isDropdownOpen && degreeProgramme.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-56 overflow-auto">
              {filteredProgrammes.length > 0 ? (
                <div className="py-1">
                  {filteredProgrammes.slice(0, 40).map((prog) => (
                    <button
                      type="button"
                      key={prog.id}
                      className="w-full text-left px-3.5 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 transition-colors"
                      onClick={() => {
                        setDegreeProgramme(prog.name);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground">{prog.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-xs text-muted-foreground text-center">
                  Using custom programme: <strong className="text-foreground">{degreeProgramme}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="year-of-study"
            className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            Academic Level
          </label>
          <select
            id="year-of-study"
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value={1}>Year 1 (100)</option>
            <option value={2}>Year 2 (200)</option>
            <option value={3}>Year 3 (300)</option>
            <option value={4}>Year 4 (400)</option>
            <option value={5}>Year 5</option>
            <option value={6}>Year 6+</option>
          </select>
        </div>
      </div>

      {/* Row 4: Semester Study Goal */}
      <div className="space-y-2">
        <label
          htmlFor="study-goal"
          className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <Target className="w-3.5 h-3.5 text-amber-500" />
          Semester Academic Objective
        </label>
        <input
          id="study-goal"
          type="text"
          value={studyGoal}
          onChange={(e) => setStudyGoal(e.target.value)}
          placeholder="e.g. Achieve First Class Honours (GPA ≥ 3.60) and complete all weekly past papers"
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 mr-1">
            <Target className="w-3 h-3 text-primary" />
            Quick targets:
          </span>
          {STUDY_GOAL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setStudyGoal(preset)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[11px] transition-colors cursor-pointer',
                studyGoal === preset
                  ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/70">
        <p className="text-xs text-muted-foreground">
          Changes synchronize immediately with your AI Tutor context and course benchmarks.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Scholar Dossier
        </button>
      </div>
    </form>
  );
}
