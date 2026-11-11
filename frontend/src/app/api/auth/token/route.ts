import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    return NextResponse.json({ 
      accessToken: session.access_token,
      userId: session.user.id
    });
  } catch (err: any) {
    return NextResponse.json({ accessToken: null, error: err.message }, { status: 500 });
  }
}

