import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { supabaseServer } from '@/lib/supabase/server';
import { checkAndAwardBadges } from '@/lib/badges';

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  
  const supabase = supabaseServer();
  const newBadges = await checkAndAwardBadges(userId!, supabase);
  
  return NextResponse.json({ newBadges: newBadges.map(b => b.id) });
}
