'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { updateAcademicProfile } from '@/app/actions/profile'

interface AcademicSettingsFormProps {
  initialYear: number | null
  initialDegree: string | null
  institutionName: string | null
}
import { InstitutionSelect } from '@/app/(auth)/onboarding/components/InstitutionSelect'

export function AcademicSettingsForm({ initialYear, initialDegree, institutionName }: AcademicSettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [degreeProgramme, setDegreeProgramme] = useState(initialDegree || '')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([])

  const filteredProgrammes = programmes.filter(prog => 
    prog.name.toLowerCase().includes(degreeProgramme.toLowerCase())
  )

  useEffect(() => {
    async function fetchProgrammes() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('course_programmes')
        .select('id, name')
        .order('name')
      
      if (data) {
        setProgrammes(data)
      }
    }
    fetchProgrammes()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const instId = formData.get('institution_id') as string

    const res = await updateAcademicProfile({
      degree_programme: degreeProgramme,
      institution_id: instId || undefined
    })

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Academic profile updated successfully!')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <InstitutionSelect initialInstitution={institutionName} />
        
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2 relative">
            <Label htmlFor="degree">Degree Programme</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="degree"
                placeholder="e.g. BSc Information Technology"
                className="pl-9 bg-background/50"
                value={degreeProgramme}
                onChange={(e) => {
                  setDegreeProgramme(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setIsDropdownOpen(false), 200)
                }}
                required
              />
            </div>
            
            {isDropdownOpen && degreeProgramme.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredProgrammes.length > 0 ? (
                  <div className="py-1">
                    {filteredProgrammes.slice(0, 50).map((prog) => (
                      <div
                        key={prog.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer flex flex-col"
                        onClick={() => {
                          setDegreeProgramme(prog.name)
                          setIsDropdownOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{prog.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Press enter to use "{degreeProgramme}" as a new programme.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Academic Details
        </Button>
      </div>
    </form>
  )
}
