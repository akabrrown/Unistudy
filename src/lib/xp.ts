export const LEVELS = [
  { level: 1, title: 'Freshman', xpRequired: 0, badge: 'gray' },
  { level: 2, title: 'Sophomore', xpRequired: 500, badge: 'bronze' },
  { level: 3, title: 'Junior', xpRequired: 1500, badge: 'bronze' },
  { level: 4, title: 'Senior', xpRequired: 3000, badge: 'silver' },
  { level: 5, title: 'Graduate', xpRequired: 6000, badge: 'silver' },
  { level: 6, title: 'Scholar', xpRequired: 10000, badge: 'gold' },
  { level: 7, title: 'Distinction', xpRequired: 18000, badge: 'gold' },
  { level: 8, title: 'Honours', xpRequired: 30000, badge: 'platinum' },
  { level: 9, title: 'Summa', xpRequired: 50000, badge: 'diamond' },
  { level: 10, title: 'Legend', xpRequired: 100000, badge: 'rainbow' },
];

export function getLevel(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) { 
    if (xp >= l.xpRequired) current = l; 
    else break; 
  }
  const nextLevel = LEVELS[current.level] || null;
  const xpToNext = nextLevel ? nextLevel.xpRequired - xp : 0;
  
  let progress = 100;
  if (nextLevel) {
    progress = ((xp - current.xpRequired) / (nextLevel.xpRequired - current.xpRequired)) * 100;
  }
  
  return { 
    ...current, 
    xpToNext, 
    progress: Math.min(100, Math.max(0, Math.round(progress))) 
  };
}

// Update level in DB after XP change
export async function syncLevel(userId: string, xp: number, supabase: any) {
  const { title } = getLevel(xp);
  await supabase.from('profiles').update({ level: title }).eq('id', userId);
}
