import { NextResponse } from 'next/server';
import { generateSlideExplanation } from '@/app/actions/explain';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    let user;
    let authErr = null;
    if (token) {
      // Use clean client without cookies to verify the token natively
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
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

    return NextResponse.json({ explanation: result.explanation });
  } catch (error: any) {
    console.error('API /explain-slide error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
}
