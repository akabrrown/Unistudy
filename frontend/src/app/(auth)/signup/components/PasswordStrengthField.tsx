'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Check, X } from 'lucide-react'

export function PasswordStrengthField() {
  const [password, setPassword] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem('signup_password')
    if (saved) {
      setPassword(saved)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem('signup_password', password)
  }, [password])

  const requirements = [
    { regex: /.{6,}/, text: 'At least 6 characters' },
    { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
    { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
    { regex: /[0-9]/, text: 'At least 1 number' },
  ]

  const strength = requirements.filter((req) => req.regex.test(password)).length

  const getStrengthColor = () => {
    if (strength === 0) return 'bg-muted'
    if (strength <= 1) return 'bg-red-500'
    if (strength <= 2) return 'bg-yellow-500'
    if (strength <= 3) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (strength === 0) return ''
    if (strength <= 1) return 'Weak'
    if (strength <= 2) return 'Fair'
    if (strength <= 3) return 'Good'
    return 'Strong'
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 relative">
        <Label htmlFor="password">Password</Label>
        <PasswordInput 
          id="password" 
          name="password" 
          required 
          className="bg-background/50" 
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />
      </div>

      {password.length > 0 && (
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Password Strength</span>
            <span className={
              strength <= 1 ? 'text-red-500' : 
              strength <= 2 ? 'text-yellow-500' : 
              strength <= 3 ? 'text-amber-500' : 'text-green-500'
            }>{getStrengthText()}</span>
          </div>
          <div className="flex gap-1 h-2">
            {[1, 2, 3, 4].map((level) => (
              <div 
                key={level} 
                className={`flex-1 rounded-full transition-colors duration-300 ${
                  level <= strength ? getStrengthColor() : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {requirements.map((req, index) => {
              const isValid = req.regex.test(password)
              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  {isValid ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={isValid ? 'text-foreground' : 'text-muted-foreground'}>
                    {req.text}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
