import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const revalidate = 60; // Cache on edge for 60 seconds

export async function GET() {
  try {
    const supabase = getAdminClient() as any;

    // Parallel fetch of public CMS assets & counts
    const [
      faqsRes,
      testimonialsRes,
      quotesRes,
      announcementsRes,
      papersCountRes,
      lecturesCountRes,
      coursesCountRes,
      usersCountRes,
    ] = await Promise.all([
      supabase.from('public_faqs').select('*').eq('is_published', true).order('display_order', { ascending: true }),
      supabase.from('public_testimonials').select('*').eq('is_approved', true).order('is_featured', { ascending: false }),
      supabase.from('platform_quotes').select('*').eq('is_active', true).limit(10),
      supabase.from('announcements').select('*').eq('type', 'banner').order('created_at', { ascending: false }).limit(1),
      supabase.from('past_papers').select('id', { count: 'exact', head: true }),
      supabase.from('lectures').select('id', { count: 'exact', head: true }),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    const stats = {
      totalPastPapers: papersCountRes.count || 240,
      totalLectures: lecturesCountRes.count || 120,
      totalCourses: coursesCountRes.count || 45,
      totalStudents: usersCountRes.count || 1850,
      facultiesCount: 4,
    };

    return NextResponse.json({
      stats,
      faqs: faqsRes.data && faqsRes.data.length > 0 ? faqsRes.data : null,
      testimonials: testimonialsRes.data && testimonialsRes.data.length > 0 ? testimonialsRes.data : null,
      quotes: quotesRes.data || [],
      activeAnnouncement: announcementsRes.data && announcementsRes.data.length > 0 ? announcementsRes.data[0] : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        stats: {
          totalPastPapers: 240,
          totalLectures: 120,
          totalCourses: 45,
          totalStudents: 1850,
          facultiesCount: 4,
        },
        faqs: null,
        testimonials: null,
        quotes: [],
        activeAnnouncement: null,
      },
      { status: 200 }
    );
  }
}
