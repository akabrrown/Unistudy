import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get('code') || '';
    if (!rawCode.trim()) {
      return NextResponse.json({ success: true, count: 0, papers: [] });
    }

    const normalizedCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const supabase = await createClient();

    // 1. Get current user's profile to extract their institution_id
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userInstitutionId: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      userInstitutionId = profile?.institution_id || null;
    }

    // 2. Query matching past papers for this normalized course code
    let query = supabase
      .from('past_papers')
      .select('id, title, year, exam_type, status, course_code, institution_id, shared_to_community')
      .eq('normalized_course_code', normalizedCode);

    if (userInstitutionId) {
      query = query.or(`institution_id.eq.${userInstitutionId},shared_to_community.eq.true`);
    } else {
      query = query.eq('shared_to_community', true);
    }

    const { data: papers, error } = await query.order('year', { ascending: false });

    if (error) {
      console.warn('[MatchPastPapers API] Supabase query error:', error.message);
      return NextResponse.json({ success: true, count: 0, papers: [] });
    }

    return NextResponse.json({
      success: true,
      courseCode: rawCode.toUpperCase().trim(),
      normalizedCode,
      count: papers ? papers.length : 0,
      papers: papers || [],
    });
  } catch (err: any) {
    console.error('[MatchPastPapers API] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to match course past papers' },
      { status: 500 }
    );
  }
}

