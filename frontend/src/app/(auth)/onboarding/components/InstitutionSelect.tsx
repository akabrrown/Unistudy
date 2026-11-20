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
          <SelectTrigger id="faculty_select" className="h-10 text-xs bg-background/50">
            <SelectValue placeholder="Select Faculty" />
          </SelectTrigger>
          <SelectContent>
            {UPSA_FACULTIES.map((fac) => (
              <SelectItem key={fac.code} value={fac.code} className="text-xs">
                <span className="font-semibold text-foreground mr-1.5">[{fac.shortName}]</span>
                {fac.name}
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
            <SelectTrigger id="level_select" className="h-10 text-xs bg-background/50">
              <SelectValue placeholder="Select Level" />
            </SelectTrigger>
            <SelectContent>
              {UPSA_LEVELS.map((lvl) => (
                <SelectItem key={lvl.value} value={String(lvl.value)} className="text-xs">
                  {lvl.label}
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
