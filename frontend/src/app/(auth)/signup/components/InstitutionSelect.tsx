'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Building2, Search, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Institution = {
  id: string
  name: string
}

export function InstitutionSelect() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    async function fetchInstitutions() {
      const supabase = createClient()
      
      // Fetch institutions and their student counts
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name')

      if (!error && data) {
        const formatted = data.map((inst: any) => ({
          id: inst.id,
          name: inst.name
        }))
        setInstitutions(formatted)
      } else {
        console.error('Failed to fetch institutions:', error)
      }
      setLoading(false)
    }

    fetchInstitutions()
    
    // Listen for custom event from EmailField
    const handleEmailDetected = async (e: any) => {
      const domain = e.detail?.domain
      if (domain) {
        try {
          const res = await fetch(`/api/institutions/by-domain?domain=${encodeURIComponent(domain)}`)
          const data = await res.json()
          if (data.found && data.institution) {
            setSelectedId(data.institution.id)
          }
        } catch (err) {
          console.error('Failed to auto-select institution by domain', err)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('institutional_email_detected', handleEmailDetected)
      return () => window.removeEventListener('institutional_email_detected', handleEmailDetected)
    }
  }, [])

  const filteredInstitutions = institutions.filter(inst => 
    inst.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedInstitution = institutions.find(i => i.id === selectedId)

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="institution_search">Institution</Label>
      
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="institution_search"
          placeholder="Search for your university..."
          className="pl-9 bg-background/50"
          value={isDropdownOpen ? search : selectedInstitution?.name || search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsDropdownOpen(true)
            if (selectedId) setSelectedId('')
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            // Delay closing so click registers
            setTimeout(() => setIsDropdownOpen(false), 200)
          }}
        />
        
      </div>

      <input type="hidden" name="institution_id" value={selectedId} required />

      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Loading institutions...</div>
          ) : filteredInstitutions.length > 0 ? (
            <div className="py-1">
              {filteredInstitutions.map((inst) => (
                <div
                  key={inst.id}
                  className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center justify-between"
                  onClick={() => {
                    setSelectedId(inst.id)
                    setSearch('')
                    setIsDropdownOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{inst.name}</span>
                  </div>
                    
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No institution found. <br/>
              <span className="text-xs">We'll register it for you.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
