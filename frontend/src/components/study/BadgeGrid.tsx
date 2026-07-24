import { BADGES } from '@/lib/badges';
import { cn } from '@/lib/utils';

export function BadgeGrid({ earnedIds }: { earnedIds: string[] }) {
  const earned = new Set(earnedIds || []);

  return (
    <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3'>
      {BADGES.map(badge => {
        const isEarned = earned.has(badge.id);
        
        return (
          <div 
            key={badge.id} 
            title={badge.name + ': ' + badge.description}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-2xl border text-center cursor-default transition-all',
              isEarned 
                ? 'border-[var(--color-amber-500)] bg-[var(--color-amber-50)] dark:bg-[var(--color-amber-900)] shadow-amber-glow' 
                : 'border-[var(--border-default)] bg-[var(--bg-elevated)] opacity-40 grayscale'
            )}
          >
            <span className='text-3xl'>{badge.emoji}</span>
            <p className='text-xs font-semibold text-[var(--text-primary)] leading-tight mt-1'>{badge.name}</p>
          </div>
        );
      })}
    </div>
  );
}
