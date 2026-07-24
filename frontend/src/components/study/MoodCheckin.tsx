'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const MOODS = [
  { value: 1, emoji: '😫', label: 'Exhausted' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Energised' },
];

export function MoodCheckin({ onComplete }: { onComplete?: (burnout: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  async function submit(mood: number) {
    setSelected(mood);
    try {
      const res = await fetch('/api/wellbeing/mood', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      });
      const data = await res.json();
      
      setDone(true);
      
      if (data.burnoutRisk) {
        toast('You have been feeling low for a few days. Consider taking a proper break today.', {
          duration: 8000, 
          icon: '💙',
        });
      }
      
      onComplete?.(data.burnoutRisk);
    } catch (e) {
      console.error(e);
      toast.error('Failed to log mood.');
      setDone(true);
    }
  }

  if (done) return (
    <p className='text-sm text-[var(--text-muted)] text-center py-2'>Mood logged. Keep going!</p>
  );

  return (
    <div className='flex flex-col gap-2'>
      <p className='text-xs font-medium text-[var(--text-muted)] text-center'>How are you feeling today?</p>
      <div className='flex justify-center gap-3'>
        {MOODS.map(m => (
          <motion.button 
            key={m.value} 
            whileHover={{ scale: 1.2 }} 
            whileTap={{ scale: 0.9 }}
            onClick={() => submit(m.value)} 
            title={m.label}
            className='text-2xl p-1.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors'
          >
            {m.emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
