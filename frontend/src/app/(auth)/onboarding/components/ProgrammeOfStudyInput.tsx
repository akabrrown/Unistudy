'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Search } from 'lucide-react'

type CourseProgramme = {
  id: string
  name: string
  field?: string
}

export function ProgrammeOfStudyInput() {
  const [programmes, setProgrammes] = useState<CourseProgramme[]>([])
  const [search, setSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProgrammes() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('course_programmes')
        .select('id, name, field')
        .order('name')

      if (!error && data) {
        setProgrammes(data)
      }
      setLoading(false)
    }

    fetchProgrammes()
  }, [])

  const filteredProgrammes = programmes.filter(prog => 
    prog.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="degree_programme">Programme of Study</Label>
      
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="degree_programme"
          name="degree_programme"
          placeholder="e.g. Computer Science"
          className="pl-9 bg-background/50"
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

      {isDropdownOpen && search.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Loading programmes...</div>
          ) : filteredProgrammes.length > 0 ? (
            <div className="py-1">
              {filteredProgrammes.slice(0, 50).map((prog) => (
                <div
                  key={prog.id}
                  className="px-3 py-2 hover:bg-accent cursor-pointer flex flex-col"
                  onClick={() => {
                    setSearch(prog.name)
                    setIsDropdownOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{prog.name}</span>
                  </div>
                  {prog.field && (
                    <span className="text-xs text-muted-foreground ml-6">{prog.field}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Press enter to use "{search}" as a new programme.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
