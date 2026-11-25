'use client';

import { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Building2, ShieldCheck, GraduationCap, CheckCircle2, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
  UPSA_INSTITUTION,
  UPSA_FACULTIES,
  getProgressionLevelsForProgramme,
  getProgrammeDetails,
} from '@/lib/constants/upsa';

interface InstitutionSelectProps {
  initialInstitution?: string | null;
  initialFaculty?: string | null;
  initialLevel?: number | string | null;
  showLevel?: boolean;
  selectedProgramme?: string | null;
  onLevelChange?: (level: number) => void;
  onFacultyChange?: (facultyCode: string, department?: string) => void;
  includeHiddenInputs?: boolean;
}

export function InstitutionSelect({
  initialFaculty,
  initialLevel,
  showLevel = true,
  selectedProgramme = null,
  onLevelChange,
  onFacultyChange,
  includeHiddenInputs = true,
}: InstitutionSelectProps = {}) {
  const matchedDetails = useMemo(() => {
    return getProgrammeDetails(selectedProgramme);
  }, [selectedProgramme]);

  const [selectedFaculty, setSelectedFaculty] = useState<string>(
    matchedDetails?.facultyCode || initialFaculty || UPSA_FACULTIES[0].code
  );

  const [isManualOverride, setIsManualOverride] = useState(false);

  useEffect(() => {
    if (initialFaculty && !matchedDetails) {
      setSelectedFaculty(initialFaculty);
    }
  }, [initialFaculty, matchedDetails]);

  useEffect(() => {
    if (matchedDetails?.facultyCode) {
      setSelectedFaculty(matchedDetails.facultyCode);
      setIsManualOverride(false);
      onFacultyChange?.(matchedDetails.facultyCode, matchedDetails.department);
    }
  }, [matchedDetails, onFacultyChange]);

  const progressionLevels = useMemo(() => {
    return getProgressionLevelsForProgramme(selectedProgramme);
  }, [selectedProgramme]);

  const parsedInitialLevel = Number(initialLevel) || null;

  const [selectedLevel, setSelectedLevel] = useState<number>(() => {
    if (parsedInitialLevel && progressionLevels.some((l) => l.value === parsedInitialLevel)) {
      return parsedInitialLevel;
    }
    return progressionLevels[0]?.value || 100;
  });

  useEffect(() => {
    if (
      parsedInitialLevel &&
      parsedInitialLevel !== selectedLevel &&
      progressionLevels.some((l) => l.value === parsedInitialLevel)
    ) {
      setSelectedLevel(parsedInitialLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedInitialLevel, progressionLevels]);

  useEffect(() => {
    if (!progressionLevels.some((l) => l.value === selectedLevel)) {
      const fallback = progressionLevels[0]?.value || 100;
      setSelectedLevel(fallback);
      onLevelChange?.(fallback);
    }
  }, [progressionLevels, selectedLevel, onLevelChange]);

  const handleLevelSelect = (val: string | null) => {
    if (!val) return;
    const num = Number(val) || progressionLevels[0]?.value || 100;
    setSelectedLevel(num);
    onLevelChange?.(num);
  };

  const handleFacultySelect = (code: string | null) => {
    if (!code) return;
    setSelectedFaculty(code);
    setIsManualOverride(true);
    onFacultyChange?.(code, matchedDetails?.department);
  };

  const currentFaculty = UPSA_FACULTIES.find((f) => f.code === selectedFaculty) || UPSA_FACULTIES[0];
  const currentLevelLabel =
    progressionLevels.find((l) => l.value === selectedLevel)?.label || `Level ${selectedLevel}`;

  return (
    <div className="space-y-4">
      {/* ── Verified UPSA Institutional Anchor ── */}
      <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-[#00004E]/10 text-[#00004E] dark:bg-[#D89A06]/15 dark:text-[#D89A06] shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Campus Institution
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {UPSA_INSTITUTION.name} ({UPSA_INSTITUTION.abbreviation})
            </h3>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified</span>
        </div>
      </div>

      {includeHiddenInputs && (
        <>
          <input type="hidden" name="institution_id" value={UPSA_INSTITUTION.id} />
          <input type="hidden" name="university" value={UPSA_INSTITUTION.name} />
        </>
      )}

      {/* ── Auto-Matched Faculty vs Manual Selector ── */}
      {matchedDetails && !isManualOverride ? (
        <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                  Faculty Matched
                </div>
                <h4 className="text-xs font-bold text-foreground mt-0.5">
                  {currentFaculty.name} ({currentFaculty.code})
                </h4>
                {matchedDetails.department && (
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {matchedDetails.department}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsManualOverride(true)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline transition-colors shrink-0"
            >
              Change
            </button>
          </div>

          {includeHiddenInputs && (
            <>
              <input type="hidden" name="faculty" value={selectedFaculty} />
              <input type="hidden" name="department" value={matchedDetails.department} />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="faculty_select" className="text-xs font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
              UPSA Faculty / School
            </Label>
            {matchedDetails && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFaculty(matchedDetails.facultyCode);
                  setIsManualOverride(false);
                  onFacultyChange?.(matchedDetails.facultyCode, matchedDetails.department);
                }}
                className="text-[10px] font-mono text-[#00004E] dark:text-[#D89A06] hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Re-sync with programme</span>
              </button>
            )}
          </div>
          <Select value={selectedFaculty} onValueChange={handleFacultySelect}>
            <SelectTrigger
              id="faculty_select"
              className="w-full h-11 text-xs rounded-xl bg-background border-border/80 px-3.5"
            >
              <div className="flex items-center gap-2 min-w-0 text-left">
                <span className="font-bold text-foreground text-xs shrink-0">
                  {currentFaculty.shortName}
                </span>
                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                  · {currentFaculty.name}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
              align="start"
              className="w-[var(--anchor-width)] min-w-[320px] sm:min-w-[440px] max-w-[calc(100vw-2rem)] p-1.5 rounded-xl border border-border/80 shadow-xl bg-popover z-50 max-h-[320px] overflow-y-auto"
            >
              {UPSA_FACULTIES.map((fac) => (
                <SelectItem
                  key={fac.code}
                  value={fac.code}
                  className="text-xs py-2 px-3 rounded-lg cursor-pointer my-0.5"
                >
                  <div className="flex flex-col min-w-0 gap-0.5 pr-6 w-full text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs leading-snug">
                        {fac.shortName}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {fac.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-normal whitespace-normal line-clamp-1">
                      {fac.name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {includeHiddenInputs && (
            <>
              <input type="hidden" name="faculty" value={selectedFaculty} />
              {matchedDetails?.department && (
                <input type="hidden" name="department" value={matchedDetails.department} />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Dynamic UPSA Level / Progression System ── */}
      {showLevel && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="level_select" className="text-xs font-semibold">
              Academic Level
            </Label>
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
              {progressionLevels.length} Levels
            </span>
          </div>
          <Select value={String(selectedLevel)} onValueChange={handleLevelSelect}>
            <SelectTrigger
              id="level_select"
              className="w-full h-11 text-xs rounded-xl bg-background border-border/80 px-3.5"
            >
              <span className="font-semibold text-foreground text-xs">{currentLevelLabel}</span>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
              align="start"
              className="w-[var(--anchor-width)] min-w-[240px] p-1.5 rounded-xl border border-border/80 shadow-xl bg-popover z-50"
            >
              {progressionLevels.map((lvl) => (
                <SelectItem
                  key={lvl.value}
                  value={String(lvl.value)}
                  className="text-xs py-2 px-3 rounded-lg cursor-pointer my-0.5"
                >
                  <span className="font-medium text-foreground">{lvl.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {includeHiddenInputs && <input type="hidden" name="year_of_study" value={selectedLevel} />}
        </div>
      )}
    </div>
  );
}
