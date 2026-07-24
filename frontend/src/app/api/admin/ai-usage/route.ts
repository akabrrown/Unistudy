import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('id, created_at, user_id, provider, feature, tokens_used, profiles(email)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
