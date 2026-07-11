'use client';

import { motion } from 'framer-motion';
import { getLevel, LEVELS } from '@/lib/xp';
import { Sparkles } from 'lucide-react';

export function XPBar({ xp }: { xp: number }) {
  const lvl = getLevel(xp);
  
  const LEVELS_MAP: Record<number, string> = {};
  LEVELS.forEach(l => {
    LEVELS_MAP[l.level] = l.title;
  });

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Sparkles className='h-4 w-4 text-[var(--color-amber-500)]'/>
          <span className='text-sm font-bold text-[var(--text-primary)]'>{lvl.title}</span>
          <span className='text-xs text-[var(--text-muted)]'>Lv {lvl.level}</span>
        </div>
        <span className='text-xs font-mono text-[var(--text-muted)]'>{xp.toLocaleString()} XP</span>
      </div>
      
      <div className='w-full bg-[var(--bg-subtle)] rounded-full h-2 overflow-hidden border border-[var(--border-subtle)]'>
        <motion.div
          className='h-2 rounded-full bg-gradient-to-r from-violet-600 to-amber-500'
          initial={{ width: 0 }} 
          animate={{ width: `${lvl.progress}%` }} 
          transition={{ duration: 1, ease: [0, 0, 0.2, 1] }}
        />
      </div>
      
      {lvl.xpToNext > 0 && (
        <p className='text-xs text-[var(--text-muted)] text-right'>
          {lvl.xpToNext.toLocaleString()} XP to {LEVELS_MAP[lvl.level + 1] || 'max'}
        </p>
      )}
    </div>
  );
}
