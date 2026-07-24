'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Info } from 'lucide-react'

export function EmailField() {
  const [email, setEmail] = useState('')
  const [isInstitutional, setIsInstitutional] = useState(false)
  const [isPersonal, setIsPersonal] = useState(false)

  const checkEmailDomain = (value: string) => {
    setEmail(value)
    if (!value.includes('@')) {
      setIsInstitutional(false)
      setIsPersonal(false)
      return
    }

    const domain = value.split('@')[1].toLowerCase()
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com']
    
    if (personalDomains.includes(domain)) {
      setIsPersonal(true)
      setIsInstitutional(false)
    } else {
      setIsPersonal(false)
      // Basic check for educational domains or assuming non-personal is institutional for now
      if (domain.endsWith('.edu') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.gh') || (domain.length > 3 && domain.includes('.'))) {
        setIsInstitutional(true)
        
        // Dispatch custom event for InstitutionSelect to auto-populate
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('institutional_email_detected', { detail: { domain } })
          window.dispatchEvent(event)
        }
      } else {
        setIsInstitutional(false)
      }
    }
  }

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="email">Email</Label>
      <div className="relative">
        <Input 
          id="email" 
          name="email" 
          type="email" 
          placeholder="student@university.edu" 
          required 
          className="bg-background/50 pr-10" 
          value={email}
          onChange={(e) => checkEmailDomain(e.target.value)}
        />
        {isInstitutional && (
          <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
        )}
      </div>
      
      {/* Hidden inputs to pass data to server action */}
      <input type="hidden" name="email_is_institutional" value={isInstitutional.toString()} />
      {isInstitutional && (
        <input type="hidden" name="institutional_email" value={email} />
      )}

      {isPersonal && (
        <div className="mt-2 flex gap-2 rounded-md bg-blue-50/50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <Info className="h-5 w-5 flex-shrink-0" />
          <p>
            You are using a personal email. We recommend using your institutional email if you have one, 
            to automatically connect with your university later.
          </p>
        </div>
      )}
    </div>
  )
}
