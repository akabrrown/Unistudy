'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

import { Building2, Search, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Institution = {
  id: string
  name: string
}

interface InstitutionSelectProps {
  initialInstitution?: string | null;
}

export function InstitutionSelect({ initialInstitution }: InstitutionSelectProps = {}) {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [search, setSearch] = useState(initialInstitution || '')
  const [selectedId, setSelectedId] = useState<string>(initialInstitution || '')
  const [loading, setLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    async function fetchInstitutions() {
      const fallbackUniversities = [
        "University of Ghana",
        "Kwame Nkrumah University of Science and Technology",
        "University of Cape Coast",
        "University for Development Studies",
        "University of Education, Winneba",
        "University of Mines and Technology",
        "University of Professional Studies, Accra",
        "Ghana Institute of Management and Public Administration",
        "University of Energy and Natural Resources",
        "University of Health and Allied Sciences",
        "C.K. Tedam University of Technology and Applied Sciences",
        "Simon Diedong Dombo University of Business and Integrated Development Studies",
        "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development",
        "Ghana Communication Technology University",
        "Accra Technical University",
        "Kumasi Technical University",
        "Takoradi Technical University",
        "Cape Coast Technical University",
        "Koforidua Technical University",
        "Sunyani Technical University",
        "Ho Technical University",
        "Tamale Technical University",
        "Bolgatanga Technical University",
        "Wa Technical University",
        "Ashesi University",
        "Central University",
        "Academic City University",
        "Regent University College of Science and Technology",
        "Valley View University",
        "Methodist University Ghana",
        "Presbyterian University, Ghana",
        "All Nations University",
        "Accra Institute of Technology",
        "Ghana Christian University College",
        "Lancaster University Ghana",
        "Wisconsin International University College",
        "Garden City University College",
        "KAAF University College",
        "Radford University College",
        "BlueCrest University College",
        "Zenith University College",
        "Islamic University College Ghana",
        "Dominion University College",
        "Christ Apostolic University College",
        "Catholic University College of Ghana",
        "Ghana Baptist University College",
        "Anglican University College of Technology",
        "Accra Metropolitan University"
      ];

      try {
        const res = await fetch('/api/institutions/ghana')
        if (!res.ok) throw new Error('Network response was not ok')
        const data = await res.json()
        const formatted = data.map((inst: any) => ({
          id: inst.name,
          name: inst.name,
        }))
        setInstitutions(formatted)
      } catch (error) {
        console.error('Failed to fetch from internal proxy, falling back to static list:', error)
        const formatted = fallbackUniversities.map((name) => ({
          id: name,
          name: name,
        }))
        setInstitutions(formatted)
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

      <input type="hidden" name="institution_id" value={selectedId || search} required />

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
