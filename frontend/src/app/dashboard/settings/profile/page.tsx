import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileStudioClient, type ProfileRecord, type ScholarStats } from './ProfileStudioClient';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch user profile
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile: ProfileRecord = rawProfile || {
    id: user.id,
    email: user.email,
  };

  // 2. Resolve institution name & abbreviation
  let institutionName = 'Not provided';
  let institutionAbbr: string | null = null;

  if (profile.institution_id) {
    const rawInst = profile.institution_id.trim();
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        rawInst
      );
    if (isUuid) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: inst } = await supabaseAdmin
        .from('institutions')
        .select('name, abbreviation')
        .eq('id', rawInst)
        .maybeSingle();

      if (inst?.name) {
        institutionName = inst.name;
        institutionAbbr = inst.abbreviation || null;
      } else {
        institutionName = 'Unknown Institution';
      }
    } else {
      institutionName = rawInst;
    }
  }

  // 3. Fetch comprehensive empirical scholar statistics in parallel
  const [
    coursesRes,
    lecturesRes,
    quizzesRes,
    flashcardsRes,
    papersRes,
    walletRes,
    achievementsRes,
  ] = await Promise.all([
    supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('lectures')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase.from('quiz_attempts').select('score').eq('user_id', user.id),
    supabase
      .from('flashcards')
      .select('repetitions')
      .eq('user_id', user.id)
      .gt('repetitions', 0),
    supabase
      .from('past_paper_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true),
    supabase
      .from('credit_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('achievements').select('badge').eq('user_id', user.id),
  ]);

  const quizScores: number[] = Array.isArray(quizzesRes.data)
    ? quizzesRes.data
        .map((q) => (typeof q.score === 'number' ? q.score : null))
        .filter((s): s is number => s !== null)
    : [];

  const quizCount = quizScores.length;
  const quizAvgScore =
    quizCount > 0 ? Math.round(quizScores.reduce((acc, curr) => acc + curr, 0) / quizCount) : 0;
  const perfectQuizCount = quizScores.filter((s) => s >= 99).length;

  const flashcardReps = Array.isArray(flashcardsRes.data)
    ? flashcardsRes.data.reduce(
        (sum, item) => sum + (typeof item.repetitions === 'number' ? item.repetitions : 0),
        0
      )
    : 0;

  const walletBalance =
    walletRes.data && typeof walletRes.data.balance === 'number'
      ? walletRes.data.balance
      : 0;

  const earnedBadges: string[] = Array.isArray(achievementsRes.data)
    ? achievementsRes.data
        .map((a) => (typeof a.badge === 'string' ? a.badge : null))
        .filter((b): b is string => b !== null)
    : [];

  const stats: ScholarStats = {
    coursesCount: coursesRes.count || 0,
    lecturesCount: lecturesRes.count || 0,
    quizCount,
    quizAvgScore,
    perfectQuizCount,
    flashcardReps,
    pastPapersCount: papersRes.count || 0,
    walletBalance,
  };

  return (
    <ProfileStudioClient
      initialProfile={profile}
      institutionName={institutionName}
      institutionAbbr={institutionAbbr}
      stats={stats}
      initialEarnedBadges={earnedBadges}
    />
  );
}
