'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Check, X, Lock } from 'lucide-react';
import { EASE_OUT_EXPO } from '@/lib/motion';

export function PasswordStrengthField() {
  const [password, setPassword] = useState('');

  const requirements = [
    { valid: password.length >= 8 && password.length <= 128, text: '8–128 characters' },
    { valid: /[A-Z]/.test(password), text: '1 uppercase letter' },
    { valid: /[a-z]/.test(password), text: '1 lowercase letter' },
    { valid: /[0-9]/.test(password), text: '1 number' },
  ];

  const strength = requirements.filter((req) => req.valid).length;

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
    return 'Strong';
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1.5 relative">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold text-foreground">
            Password
          </Label>
          {password.length > 0 && (
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
              {password.length}/128
            </span>
          )}
        </div>
        <div className="relative">
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
          <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {password.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 bg-muted/25 p-3 rounded-xl border border-border/50">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground">Password Strength</span>
                <span
                  className={
                    strength <= 1
                      ? 'text-red-500'
                      : strength === 2
                      ? 'text-amber-500'
                      : strength === 3
                      ? 'text-[#D89A06]'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {getStrengthLabel()}
                </span>
              </div>

              <div className="flex gap-1.5 h-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 rounded-full transition-colors duration-200 ${
                      level <= strength ? getStrengthBarColor() : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-[11px]">
                    {req.valid ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span className={req.valid ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
