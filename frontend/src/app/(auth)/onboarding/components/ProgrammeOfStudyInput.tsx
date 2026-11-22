
'use client'

import { useState, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { GraduationCap, Search, Check, ExternalLink, Filter } from 'lucide-react'
import { UPSA_PROGRAMMES_CATALOG, UPSAStudyLevelTier } from '@/lib/constants/upsa'
import { Badge } from '@/components/ui/badge'

interface ProgrammeOfStudyInputProps {
  onProgrammeChange?: (name: string, department?: string, facultyCode?: string) => void
  initialValue?: string
}

export function ProgrammeOfStudyInput({ onProgrammeChange, initialValue = '' }: ProgrammeOfStudyInputProps = {}) {
  const [search, setSearch] = useState(initialValue)
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const filteredProgrammes = useMemo(() => {
    return UPSA_PROGRAMMES_CATALOG.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.department.toLowerCase().includes(search.toLowerCase())
      const matchesTier = selectedTier === 'all' || item.level === selectedTier
      return matchesSearch && matchesTier
    })
  }, [search, selectedTier])

  return (
    <div className="space-y-2.5 relative">
      <div className="flex items-center justify-between">
        <Label htmlFor="degree_programme" className="text-xs font-semibold flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-primary" />
          UPSA Degree Programme / Major
        </Label>
        <span className="text-[10px] text-muted-foreground font-mono">
          {UPSA_PROGRAMMES_CATALOG.length} Official UPSA Programmes
        </span>
      </div>

      {/* Tier Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: 'All Tiers' },
          { id: 'undergraduate', label: 'Undergraduate' },
          { id: 'postgraduate', label: 'Postgraduate (PhD/Masters)' },
          { id: 'diploma', label: 'Diploma' },
          { id: 'professional', label: 'Professional' },
        ].map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => {
              setSelectedTier(tier.id)
              setIsDropdownOpen(true)
            }}
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors cursor-pointer border ${
              selectedTier === tier.id
                ? 'bg-primary text-primary-foreground border-primary font-bold'
                : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id="degree_programme"
          name="degree_programme"
          placeholder="Search by programme or department (e.g. Accounting, IT, Law, Marketing)..."
          className="pl-9 h-10 text-xs bg-background/50 border-primary/20"
          value={search}
          onChange={(e) => {
            const val = e.target.value
            setSearch(val)
            setIsDropdownOpen(true)
            onProgrammeChange?.(val, selectedDepartment)
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsDropdownOpen(false), 250)
          }}
          required
        />
      </div>

      {/* Hidden input to pass selected department to server action */}
      <input type="hidden" name="department" value={selectedDepartment} />

      {isDropdownOpen && (
        <div className="absolute z-30 w-full mt-1 bg-popover/98 backdrop-blur-md border border-primary/30 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-border/40">
          {filteredProgrammes.length > 0 ? (
            filteredProgrammes.map((item) => (
              <button
                key={item.name}
                type="button"
                className="w-full text-left px-3.5 py-2.5 text-xs text-foreground hover:bg-primary/10 flex items-start justify-between gap-2 transition-colors cursor-pointer"
                onMouseDown={() => {
                  setSearch(item.name)
                  setSelectedDepartment(item.department)
                  setIsDropdownOpen(false)
                  onProgrammeChange?.(item.name, item.department, item.facultyCode)
                }}
              >
                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground text-xs leading-snug">{item.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-primary border-primary/30">
                      {item.subCategory || item.level}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {item.department}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  {item.admissionsUrl && (
                    <a
                      href={item.admissionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                      title="View Official UPSA Admissions Handbook"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {search === item.name && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-xs text-muted-foreground text-center space-y-1">
              <div>No exact match found in UPSA catalog.</div>
              <div className="text-[11px] opacity-80">
                You can submit with custom programme: <strong className="text-foreground">&ldquo;{search}&rdquo;</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
