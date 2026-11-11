import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token || null;

    if (!token) {
      // Fallback: extract token directly from Supabase auth cookie chunks
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      const authCookies = allCookies
        .filter(c => c.name.includes('-auth-token'))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (authCookies.length > 0) {
        const rawValue = authCookies.map(c => c.value).join('');
        try {
          const parsed = JSON.parse(decodeURIComponent(rawValue));
          token = parsed.access_token || parsed[0] || null;
        } catch {
          try {
            const parsed = JSON.parse(rawValue);
            token = parsed.access_token || parsed[0] || null;
          } catch {}
        }
      }
    }

    if (!token) {
      return NextResponse.json({ accessToken: null }, { status: 401 });
    }

    return NextResponse.json({ 
      accessToken: token,
      userId: user.id
    });
  } catch (err: any) {
    return NextResponse.json({ accessToken: null, error: err.message }, { status: 500 });
  }
}
