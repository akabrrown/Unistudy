'use client';

import { toast } from 'sonner';
import { BADGES } from '@/lib/badges';

export async function checkBadgesAndNotify() {
  try {
    const res = await fetch('/api/profile/badges/check', { method: 'POST' });
    const data = await res.json();
    
    for (const badgeId of (data.newBadges || [])) {
      const badge = BADGES.find(b => b.id === badgeId);
      if (badge) {
        toast(`${badge.emoji} New Badge: ${badge.name}`, {
          description: badge.description,
          duration: 5000,
        });
      }
    }
  } catch (error) {
    console.error("Failed to check badges", error);
  }
}

// Optional utility component if we want to check on mount
import { useEffect } from 'react';

export function BadgeListener() {
  useEffect(() => {
    // Check badges on mount just in case
    checkBadgesAndNotify();
  }, []);
  
  return null;
}
