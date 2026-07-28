'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FullNameField() {
  const [fullName, setFullName] = useState('')

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
