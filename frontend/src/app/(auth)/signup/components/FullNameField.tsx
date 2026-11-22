'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

export function FullNameField() {
  const [fullName, setFullName] = useState('');

  return (
    <div className="space-y-1.5">
      <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">
        Full Name
      </Label>
      <div className="relative">
        <Input
          id="fullName"
          name="fullName"
          placeholder="e.g. Kofi Mensah"
          required
          autoComplete="name"
          className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
      </div>
    </div>
  );
}
