'use client';

import { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck, GraduationCap, CheckCircle2, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { 
  UPSA_INSTITUTION, 
  UPSA_FACULTIES, 
  getProgressionLevelsForProgramme, 
  getProgrammeDetails 
} from '@/lib/constants/upsa';

interface InstitutionSelectProps {
  initialInstitution?: string | null;
  initialFaculty?: string | null;
  initialLevel?: number | null;
  showLevel?: boolean;
  selectedProgramme?: string | null;
}

export function InstitutionSelect({
  initialInstitution,
  initialFaculty,
  initialLevel,
  showLevel = true,
  selectedProgramme = null,
}: InstitutionSelectProps = {}) {
  const matchedDetails = useMemo(() => {
    return getProgrammeDetails(selectedProgramme);
  }, [selectedProgramme]);

  const [selectedFaculty, setSelectedFaculty] = useState<string>(
    matchedDetails?.facultyCode || initialFaculty || UPSA_FACULTIES[0].code
  );

  const [isManualOverride, setIsManualOverride] = useState(false);

  // Automatically sync faculty whenever a known programme is chosen
  useEffect(() => {
    if (matchedDetails?.facultyCode) {
      setSelectedFaculty(matchedDetails.facultyCode);
      setIsManualOverride(false);
    }
  }, [matchedDetails]);

  const progressionLevels = useMemo(() => {
    return getProgressionLevelsForProgramme(selectedProgramme);
  }, [selectedProgramme]);

  const [selectedLevel, setSelectedLevel] = useState<number>(() => {
    if (initialLevel && progressionLevels.some((l) => l.value === initialLevel)) {
      return initialLevel;
    }
    return progressionLevels[0]?.value || 100;
  });

  // Whenever the programme changes, ensure the selected level remains valid for that tier
  useEffect(() => {
    if (!progressionLevels.some((l) => l.value === selectedLevel)) {
      setSelectedLevel(progressionLevels[0]?.value || 100);
    }
  }, [progressionLevels, selectedLevel]);

  const currentFaculty = UPSA_FACULTIES.find((f) => f.code === selectedFaculty) || UPSA_FACULTIES[0];
  const currentLevelLabel = progressionLevels.find((l) => l.value === selectedLevel)?.label || `Level ${selectedLevel}`;

  return (
    <div className="space-y-4">
      {/* ── Verified UPSA Institutional Anchor ── */}
      <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Academic Institution</span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold">
                  Exclusive Campus
                </Badge>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {UPSA_INSTITUTION.name} ({UPSA_INSTITUTION.abbreviation})
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified</span>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-1 border-t border-primary/10 font-mono">
          <span>Portal: {UPSA_INSTITUTION.portalUrl.replace('https://', '')}</span>
          <span>•</span>
          <span>Motto: &ldquo;{UPSA_INSTITUTION.motto}&rdquo;</span>
        </div>
      </div>

      {/* Hidden inputs to pass UPSA canonical info */}
      <input type="hidden" name="institution_id" value={UPSA_INSTITUTION.id} />
      <input type="hidden" name="university" value={UPSA_INSTITUTION.name} />

      {/* ── Auto-Matched Faculty vs Manual Selector ── */}
      {matchedDetails && !isManualOverride ? (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span>Faculty &amp; Department (Auto-Matched)</span>
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
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline transition-colors shrink-0 pt-0.5"
            >
              Change
            </button>
          </div>

          <input type="hidden" name="faculty" value={selectedFaculty} />
          <input type="hidden" name="department" value={matchedDetails.department} />
        </div>
      ) : (
        /* Manual Faculty Selector Fallback */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="faculty_select" className="text-xs font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              Select Your UPSA Faculty / School
            </Label>
            {matchedDetails && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFaculty(matchedDetails.facultyCode);
                  setIsManualOverride(false);
                }}
                className="text-[10px] font-mono text-[#D89A06] hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Re-sync with programme</span>
              </button>
            )}
          </div>
          <Select
            value={selectedFaculty}
            onValueChange={(val: any) => setSelectedFaculty(val || UPSA_FACULTIES[0].code)}
          >
            <SelectTrigger id="faculty_select" className="w-full h-12 text-xs bg-background/60 hover:bg-background border-primary/20 px-3.5">
              <div className="flex items-center gap-2 min-w-0 text-left">
                <span className="font-bold text-foreground text-xs shrink-0">
                  {currentFaculty.shortName}
                </span>
                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                  • {currentFaculty.name}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
              align="start"
              className="w-[var(--anchor-width)] min-w-[340px] sm:min-w-[460px] max-w-[calc(100vw-2rem)] p-1.5 rounded-xl border border-primary/20 shadow-2xl bg-popover/98 backdrop-blur-md z-50 max-h-[320px] overflow-y-auto"
            >
              {UPSA_FACULTIES.map((fac) => (
                <SelectItem
                  key={fac.code}
                  value={fac.code}
                  className="text-xs py-2 px-3 rounded-lg cursor-pointer my-0.5 focus:bg-primary/10 focus:text-foreground data-[state=checked]:bg-primary/10 transition-colors"
                >
                  <div className="flex flex-col min-w-0 gap-0.5 pr-6 w-full text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs leading-snug">
                        {fac.shortName}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
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
          <input type="hidden" name="faculty" value={selectedFaculty} />
          {matchedDetails?.department && (
            <input type="hidden" name="department" value={matchedDetails.department} />
          )}
        </div>
      )}

      {/* ── Dynamic UPSA Level / Progression System ── */}
      {showLevel && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="level_select" className="text-xs font-semibold">
              Academic Progression Level
            </Label>
            <span className="text-[10px] font-mono text-muted-foreground">
              {progressionLevels.length} Stages for this tier
            </span>
          </div>
          <Select
            value={String(selectedLevel)}
            onValueChange={(val) => setSelectedLevel(Number(val) || progressionLevels[0]?.value || 100)}
          >
            <SelectTrigger id="level_select" className="w-full h-11 text-xs bg-background/60 hover:bg-background border-primary/20 px-3.5">
              <span className="font-semibold text-foreground text-xs">
                {currentLevelLabel}
              </span>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
              align="start"
              className="w-[var(--anchor-width)] min-w-[240px] p-1.5 rounded-xl border border-primary/20 shadow-xl bg-popover/98 backdrop-blur-md z-50"
            >
              {progressionLevels.map((lvl) => (
                <SelectItem
                  key={lvl.value}
                  value={String(lvl.value)}
                  className="text-xs py-2 px-3 rounded-lg cursor-pointer my-0.5 focus:bg-primary/10"
                >
                  <span className="font-medium text-foreground">{lvl.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="year_of_study" value={selectedLevel} />
        </div>
      )}
    </div>
  );
}
