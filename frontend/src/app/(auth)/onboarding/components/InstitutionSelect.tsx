'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building2, ShieldCheck, GraduationCap, CheckCircle2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UPSA_INSTITUTION, UPSA_FACULTIES, UPSA_LEVELS } from '@/lib/constants/upsa'

interface InstitutionSelectProps {
  initialInstitution?: string | null
  initialFaculty?: string | null
  initialLevel?: number | null
  showLevel?: boolean
}

export function InstitutionSelect({
  initialInstitution,
  initialFaculty,
  initialLevel,
  showLevel = true
}: InstitutionSelectProps = {}) {
  const [selectedFaculty, setSelectedFaculty] = useState<string>(
    initialFaculty || UPSA_FACULTIES[0].code
  )
  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel || 100)

  const currentFaculty = UPSA_FACULTIES.find((f) => f.code === selectedFaculty) || UPSA_FACULTIES[0]

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

      {/* ── UPSA Faculty / School Selection ── */}
      <div className="space-y-1.5">
        <Label htmlFor="faculty_select" className="text-xs font-semibold flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-primary" />
          Select Your UPSA Faculty / School
        </Label>
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
      </div>

      {/* ── UPSA Level of Study ── */}
      {showLevel && (
        <div className="space-y-1.5">
          <Label htmlFor="level_select" className="text-xs font-semibold">
            Level of Study
          </Label>
          <Select
            value={String(selectedLevel)}
            onValueChange={(val) => setSelectedLevel(Number(val) || 100)}
          >
            <SelectTrigger id="level_select" className="w-full h-11 text-xs bg-background/60 hover:bg-background border-primary/20 px-3.5">
              <span className="font-semibold text-foreground text-xs">
                Level {selectedLevel}
              </span>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
              align="start"
              className="w-[var(--anchor-width)] min-w-[220px] p-1.5 rounded-xl border border-primary/20 shadow-xl bg-popover/98 backdrop-blur-md z-50"
            >
              {UPSA_LEVELS.map((lvl) => (
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
  )
}
