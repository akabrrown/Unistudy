'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    async function fetchPreferences() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        if (prefs.dyslexia_font) {
          document.body.classList.add('font-dyslexic');
        } else {
          document.body.classList.remove('font-dyslexic');
        }

        if (prefs.high_contrast) {
          document.body.classList.add('contrast-more');
        } else {
          document.body.classList.remove('contrast-more');
        }

        if (prefs.text_size === 'large') {
          document.body.classList.add('text-lg');
        } else if (prefs.text_size === 'xlarge') {
          document.body.classList.add('text-xl');
        } else {
          document.body.classList.remove('text-lg', 'text-xl');
        }
      }
    }

    fetchPreferences();

    // Optionally, listen to local storage or an event bus to update these immediately when changed in settings.
    const handleStorageChange = () => fetchPreferences();
    window.addEventListener('accessibility-updated', handleStorageChange);

    return () => {
      window.removeEventListener('accessibility-updated', handleStorageChange);
    };
  }, []);

  return <>{children}</>;
}
