'use server'

import { createClient } from '@/lib/supabase/server'
import { executeWithRotation } from '@/lib/ai/keyManager'

export async function generateSlideExplanation(slideText: string, level: string, courseContext: string, visionExplanation?: string, imageUrl?: string): Promise<{ explanation: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { explanation: '', error: 'Unauthorized' };
    }
    
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
    const res = await fetch(`${BACKEND_URL}/api/ai/explain`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ slideText, level, courseContext, visionExplanation, imageUrl })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { explanation: '', error: err.error || 'Failed to generate explanation' };
    }

    const data = await res.json();
    return { explanation: data.explanation };
  } catch (error: any) {
    console.error('Explanation API Error:', error);
    return { explanation: '', error: error.message };
  }
}
