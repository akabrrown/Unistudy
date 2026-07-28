'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function EmailField() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)

  const isValid = EMAIL_REGEX.test(email)
  const showError = touched && email.length > 0 && !isValid

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="email">Email</Label>
      <div className="relative">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="bg-background/50 pr-10"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {isValid && (
          <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
        )}
        {showError && (
          <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
        )}
      </div>

      {showError && (
        <p className="text-xs text-red-500 mt-1">
          Enter a valid email address.
        </p>
      )}
    </div>
  )
}
