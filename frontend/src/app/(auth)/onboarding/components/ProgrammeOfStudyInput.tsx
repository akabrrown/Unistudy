'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { GraduationCap, Search, Check } from 'lucide-react'
import { ALL_UPSA_PROGRAMMES } from '@/lib/constants/upsa'

export function ProgrammeOfStudyInput() {
  const [search, setSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const filteredProgrammes = ALL_UPSA_PROGRAMMES.filter(prog =>
    prog.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <Label htmlFor="degree_programme" className="text-xs font-semibold">
          UPSA Degree Programme / Major
        </Label>
        <span className="text-[10px] text-muted-foreground font-mono">
          {ALL_UPSA_PROGRAMMES.length} Accredited UPSA Programmes
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="degree_programme"
          name="degree_programme"
          placeholder="e.g. BSc Information Technology Management, BSc Accounting, LLB Law..."
          className="pl-9 h-10 text-xs bg-background/50"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsDropdownOpen(true)
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsDropdownOpen(false), 200)
          }}
          required
        />
      </div>

      {isDropdownOpen && (
        <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-auto divide-y divide-border/40">
          {filteredProgrammes.length > 0 ? (
            filteredProgrammes.map((prog) => (
              <button
                key={prog}
                type="button"
                className="w-full text-left px-3.5 py-2.5 text-xs text-foreground hover:bg-muted flex items-center justify-between transition-colors"
                onMouseDown={() => {
                  setSearch(prog)
                  setIsDropdownOpen(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{prog}</span>
                </div>
                {search === prog && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))
          ) : (
            <div className="p-3 text-xs text-muted-foreground text-center">
              Press enter to use custom major &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
