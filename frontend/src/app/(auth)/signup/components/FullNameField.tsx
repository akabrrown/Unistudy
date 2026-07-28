'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FullNameField() {
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem('signup_fullName')
    if (saved) setFullName(saved)
  }, [])

  useEffect(() => {
    sessionStorage.setItem('signup_fullName', fullName)
  }, [fullName])

  return (
    <div className="space-y-2">
      <Label htmlFor="fullName">Full Name</Label>
      <Input 
        id="fullName" 
        name="fullName" 
        placeholder="" 
        required 
        className="bg-background/50" 
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
    </div>
  )
}
