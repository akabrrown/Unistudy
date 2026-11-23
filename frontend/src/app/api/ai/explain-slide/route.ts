import { NextResponse } from 'next/server';
import { generateSlideExplanation } from '@/app/actions/explain';
import { getPublicSupabaseClient } from '@/lib/supabase/anon';
import { enforceHighCostLimit } from '@/lib/ratelimit';

export async function POST(request: Request) {
  let releaseGuard: (() => void) | undefined;
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];

    let user;
    let authErr = null;
    if (token) {
      // Reuse stateless anon client to verify bearer token without per-request client allocation
      const supabase = getPublicSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      user = data?.user;
      authErr = error;
    } else {
      // Try to get user via cookies as fallback
      const { createClient } = await import('@/lib/supabase/server');
      const supabaseServer = await createClient();
      const { data, error } = await supabaseServer.auth.getUser();
      user = data?.user;
      authErr = error;
    }

    if (!user) {
      console.error('API Unauthorized. Token present?', !!token, 'Error:', authErr);
      return NextResponse.json({ error: `Unauthorized: ${authErr?.message || 'No user found'}` }, { status: 401 });
    }

    const limit = await enforceHighCostLimit(user.id);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many explanation requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }
    releaseGuard = limit.release;

    // Verify and deduct 1 credit for slide explanation
    const { deductUserCredits } = await import('@/lib/ai/quota');
    const creditCheck = await deductUserCredits(user.id, 'slide_explanation', 'gemini', 1);
    if (!creditCheck.allowed) {
      return NextResponse.json(
        {
          error: creditCheck.error || 'You have exhausted your AI Credits (0 remaining). Please top up in Billing to continue.',
          code: 'INSUFFICIENT_CREDITS',
          remainingCredits: creditCheck.remainingCredits,
        },
        { status: 402 }
      );
    }

    const { slideText, level, courseContext, visionExplanation, imageUrl } = await request.json();

    const result = await generateSlideExplanation(
      slideText || '',
      level || 'Med',
      courseContext || 'University Course',
      visionExplanation,
      imageUrl
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      explanation: result.explanation,
      remainingCredits: creditCheck.remainingCredits,
    });
  } catch (error: any) {
    console.error('API /explain-slide error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  } finally {
    releaseGuard?.();
  }
}
