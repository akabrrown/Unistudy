'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Check, X } from 'lucide-react'

export function PasswordStrengthField() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const requirements = [
    { regex: /.{8,}/, text: 'At least 8 characters' },
    { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
    { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
    { regex: /[0-9]/, text: 'At least 1 number' },
    { regex: /[^A-Za-z0-9]/, text: 'At least 1 special character' },
  ]

  const strength = requirements.filter((req) => req.regex.test(password)).length
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  const getStrengthColor = () => {
    if (strength === 0) return 'bg-muted'
    if (strength <= 2) return 'bg-red-500'
    if (strength <= 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (strength === 0) return ''
    if (strength <= 2) return 'Weak'
    if (strength <= 4) return 'Medium'
    return 'Strong'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="space-y-2 relative">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput 
            id="confirmPassword" 
            name="confirmPassword" 
            required 
            className="bg-background/50" 
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>

      {password.length > 0 && (
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Password Strength</span>
            <span className={
              strength <= 2 ? 'text-red-500' : 
              strength <= 4 ? 'text-yellow-500' : 'text-green-500'
            }>{getStrengthText()}</span>
          </div>
          <div className="flex gap-1 h-2">
            {[1, 2, 3, 4, 5].map((level) => (
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
          
          {confirmPassword.length > 0 && (
            <div className={`text-xs flex items-center gap-2 mt-2 ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
              {passwordsMatch ? (
                <><Check className="h-4 w-4" /> Passwords match</>
              ) : (
                <><X className="h-4 w-4" /> Passwords do not match</>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
