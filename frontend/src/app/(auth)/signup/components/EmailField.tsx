'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Mail } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function EmailField() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const isValid = EMAIL_REGEX.test(email);
  const showError = touched && email.length > 0 && !isValid;

  return (
    <div className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <Label htmlFor="email" className="text-xs font-semibold text-foreground">
          Student / University Email
        </Label>
        <span className="text-[10px] text-muted-foreground font-mono">
          UPSA email preferred
        </span>
      </div>

      <div className="relative">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="student@upsamail.edu.gh"
          required
          autoComplete="email"
          className="pl-10 pr-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />

        {isValid && (
          <CheckCircle2 className="absolute right-3.5 top-3 h-4 w-4 text-emerald-500" />
        )}
        {showError && (
          <AlertCircle className="absolute right-3.5 top-3 h-4 w-4 text-destructive" />
        )}
      </div>

      {showError && (
        <p className="text-[11px] text-destructive mt-1 font-medium">
          Please enter a valid email address.
        </p>
      )}
    </div>
  );
}
