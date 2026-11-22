'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Check, X, Lock } from 'lucide-react';

export function PasswordStrengthField() {
  const [password, setPassword] = useState('');

  const requirements = [
    { regex: /.{8,}/, text: 'At least 8 characters' },
    { regex: /[A-Z]/, text: '1 uppercase letter' },
    { regex: /[a-z]/, text: '1 lowercase letter' },
    { regex: /[0-9]/, text: '1 number' },
  ];

  const strength = requirements.filter((req) => req.regex.test(password)).length;

  const getStrengthBarColor = () => {
    if (strength <= 1) return 'bg-red-500';
    if (strength === 2) return 'bg-amber-500';
    if (strength === 3) return 'bg-[#D89A06]';
    return 'bg-emerald-500';
  };

  const getStrengthLabel = () => {
    if (strength === 0) return '';
    if (strength <= 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';
    return 'Strong & Secure';
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1.5 relative">
        <Label htmlFor="password" className="text-xs font-semibold text-foreground">
          Password
        </Label>
        <div className="relative">
          <PasswordInput 
            id="password" 
            name="password" 
            required 
            autoComplete="new-password"
            className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm" 
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
          <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      {password.length > 0 && (
        <div className="space-y-2.5 bg-muted/30 p-3.5 rounded-xl border border-border/60">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-muted-foreground">Security Rating</span>
            <span className={
              strength <= 1 ? 'text-red-500' : 
              strength === 2 ? 'text-amber-500' : 
              strength === 3 ? 'text-[#D89A06]' : 'text-emerald-500'
            }>
              {getStrengthLabel()}
            </span>
          </div>

          <div className="flex gap-1.5 h-1.5">
            {[1, 2, 3, 4].map((level) => (
              <div 
                key={level} 
                className={`flex-1 rounded-full transition-all duration-300 ${
                  level <= strength ? getStrengthBarColor() : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {requirements.map((req, index) => {
              const isValid = req.regex.test(password);
              return (
                <div key={index} className="flex items-center gap-1.5 text-[11px]">
                  {isValid ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  <span className={isValid ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {req.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
