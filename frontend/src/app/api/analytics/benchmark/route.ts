import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const courseId = url.searchParams.get('courseId');
  
  if (!courseId) {
    return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
  }

  const supabase = await createClient();
  
  // get_benchmark is currently configured without the 5-student minimum for testing
  const { data, error: rpcError } = await supabase.rpc('get_benchmark', {
    p_user_id: userId,
    p_course_id: courseId
  });

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    return NextResponse.json({ error: "Failed to fetch benchmarks" }, { status: 500 });
  }

  return NextResponse.json({ benchmarks: data || [] });
}
