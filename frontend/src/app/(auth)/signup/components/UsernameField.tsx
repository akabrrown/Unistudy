'use client';

import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2, AtSign } from 'lucide-react';

export function UsernameField() {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!username || username.trim() === '') {
      setIsAvailable(null);
      setSuggestions([]);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        
        if (res.ok) {
          setIsAvailable(data.available);
          setSuggestions(data.suggestions || []);
        } else {
          setIsAvailable(null);
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Failed to check username', err);
        setIsAvailable(null);
        setSuggestions([]);
      } finally {
        setIsChecking(false);
      }
    }, 450);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [username]);

  useEffect(() => {
    if (inputRef.current) {
      if (isChecking) {
        inputRef.current.setCustomValidity('Checking username availability...');
      } else if (isAvailable === false) {
        inputRef.current.setCustomValidity('Username is already taken.');
      } else {
        inputRef.current.setCustomValidity('');
      }
    }
  }, [isChecking, isAvailable]);

  return (
    <div className="space-y-1.5 relative">
      <Label htmlFor="username" className="text-xs font-semibold text-foreground">
        Username
      </Label>
      <div className="relative">
        <Input 
          ref={inputRef}
          id="username" 
          name="username" 
          placeholder="e.g. kmensah" 
          required 
          autoComplete="username"
          className="pl-10 pr-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm font-mono" 
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        />
        <AtSign className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
        
        <div className="absolute right-3.5 top-3 flex items-center justify-center">
          {isChecking && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
          {!isChecking && isAvailable === true && <Check className="h-4 w-4 text-emerald-500" />}
          {!isChecking && isAvailable === false && <X className="h-4 w-4 text-destructive" />}
        </div>
      </div>

      {suggestions.length > 0 && !isChecking && isAvailable === false && (
        <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5 flex-wrap">
          <span>Suggestions:</span>
          {suggestions.slice(0, 3).map((sugg) => (
            <button
              key={sugg}
              type="button"
              onClick={() => setUsername(sugg)}
              className="px-2 py-0.5 rounded bg-muted hover:bg-[#D89A06]/15 hover:text-[#D89A06] transition-colors font-mono font-medium text-[10px]"
            >
              @{sugg}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
