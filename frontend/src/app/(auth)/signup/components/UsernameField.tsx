'use client'

import { useState, useEffect, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UsernameField() {
  const [username, setUsername] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  // Ref for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!username || username.trim() === '') {
      setIsAvailable(null)
      setSuggestions([])
      setIsChecking(false)
      return
    }

    // Set a new timeout to debounce the API call
    setIsChecking(true)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/check-username?username=${encodeURIComponent(username)}`)
        const data = await res.json()
        
        if (res.ok) {
          setIsAvailable(data.available)
          setSuggestions(data.suggestions || [])
        } else {
          // Fallback on error
          setIsAvailable(null)
          setSuggestions([])
        }
      } catch (err) {
        console.error('Failed to check username', err)
        setIsAvailable(null)
        setSuggestions([])
      } finally {
        setIsChecking(false)
      }
    }, 500) // 500ms debounce

    // Cleanup on unmount or on next effect
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [username])

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      if (isChecking) {
        inputRef.current.setCustomValidity('Checking username availability...')
      } else if (isAvailable === false) {
        inputRef.current.setCustomValidity('Username is already taken.')
      } else {
        inputRef.current.setCustomValidity('')
      }
    }
  }, [isChecking, isAvailable])

  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion)
    // The useEffect will run again and verify it, which is correct and safe
  }

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="username">Username</Label>
      <div className="relative">
        <Input 
          ref={inputRef}
          id="username" 
          name="username" 
          placeholder="" 
          required 
          className="bg-background/50 pr-10" 
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} // Basic sanitization
        />
        
        {/* Status Icon */}
        <div className="absolute right-3 top-2.5 flex items-center justify-center">
          {isChecking && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
          {!isChecking && isAvailable === true && <Check className="h-4 w-4 text-green-500" />}
          {!isChecking && isAvailable === false && <X className="h-4 w-4 text-destructive" />}
        </div>
      </div>

      {/* Suggestions / Error Message */}
      {!isChecking && isAvailable === false && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
          <p className="text-xs text-destructive mb-2 font-medium">Username is already taken.</p>
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Available suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 px-2 py-1 rounded-md transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
