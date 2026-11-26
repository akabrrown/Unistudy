import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  syncAllBankPapers,
  syncCoursePapersFromKlok,
} from '@/lib/past-papers/ingestion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds on serverless edge/node

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}

async function handleSync(req: NextRequest) {
  try {
    // 1. Authorize: either via Vercel Cron Secret or Admin User Session
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized =
      Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

    let isAdminAuthorized = false;
    if (!isCronAuthorized) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile?.role === 'admin') {
            isAdminAuthorized = true;
          }
        }
      } catch (authErr) {
        // Not admin session
      }
    }

    if (!isCronAuthorized && !isAdminAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: CRON_SECRET or Admin role required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const specificCourseCode = searchParams.get('courseCode');

    // 2. Perform Bank Sync
    if (specificCourseCode) {
      const result = await syncCoursePapersFromKlok(specificCourseCode);
      return NextResponse.json({
        success: true,
        mode: 'single-course',
        courseCode: specificCourseCode.toUpperCase().trim(),
        totalFound: result.totalFound,
        newlyIngested: result.newlyIngested,
        timestamp: new Date().toISOString(),
      });
    }

    const summary = await syncAllBankPapers();
    return NextResponse.json({
      success: true,
      mode: 'all-courses',
      checkedCoursesCount: summary.checkedCodes.length,
      checkedCodes: summary.checkedCodes,
      totalFound: summary.totalFound,
      newlyIngested: summary.newlyIngested,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[API /api/cron/sync-past-papers] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message },
      { status: 500 }
    );
  }
}
