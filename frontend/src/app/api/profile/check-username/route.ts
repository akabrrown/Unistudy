import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/anon';
import { checkRateLimit } from '@/lib/security/rateLimiter';

const USERNAME_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=30, s-maxage=60',
};

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rate = await checkRateLimit(`check-username:${clientIp}`, {
    limit: 30,
    windowSeconds: 60,
  });
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many username checks. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get('username');
  const username = rawUsername?.trim() || '';

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  if (username.length < 3 || username.length > 30) {
    return NextResponse.json(
      { error: 'Username must be between 3 and 30 characters' },
      { status: 400 }
    );
  }

  // Reuse stateless service role client to check username uniqueness
  const supabase = getAdminSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      return NextResponse.json({ error: 'Failed to verify username' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { available: true, suggestions: [] },
        { headers: USERNAME_CACHE_HEADERS }
      );
    }

    const suffixes = ['_gh', '_official', '_real', '_student', '_study', '_1', '_2024', '_x', '123'];
    const candidates = suffixes.map((suffix) => `${username}${suffix}`);

    const { data: takenCandidates, error: takenError } = await supabase
      .from('profiles')
      .select('username')
      .in('username', candidates);

    if (takenError) {
      console.error('Error checking candidates:', takenError);
      return NextResponse.json(
        { available: false, suggestions: [] },
        { headers: USERNAME_CACHE_HEADERS }
      );
    }

    const takenSet = new Set(takenCandidates.map((c) => c.username));
    const suggestions = candidates.filter((c) => !takenSet.has(c)).slice(0, 3);

    return NextResponse.json(
      { available: false, suggestions },
      { headers: USERNAME_CACHE_HEADERS }
    );
  } catch (err) {
    console.error('Unexpected error checking username:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
