import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

const Schema = z.object({
  tutor_name: z.string().max(30).optional(),
  tutor_personality: z.enum(['encouraging', 'strict', 'funny', 'neutral']).optional(),
  reading_level: z.number().int().min(1).max(5).optional(),
  tone_preference: z.enum(['academic', 'casual']).optional(),
  preferred_language: z.string().max(5).optional(),
  font_preference: z.enum(['inter', 'opendyslexic']).optional(),
  high_contrast: z.boolean().optional(),
  text_size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  simplified_mode: z.boolean().optional(),
  low_bandwidth_mode: z.boolean().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  university: z.string().max(100).optional(),
  degree: z.string().max(100).optional(),
  year_of_study: z.number().int().min(1).max(8).optional(),
  study_goal: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  
  try {
    const updates = Schema.parse(await req.json());
    
    const supabase = await createClient();
    await supabase.from('profiles').update(updates).eq('id', userId!);
    
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
