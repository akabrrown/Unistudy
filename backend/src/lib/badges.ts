import { supabaseAdmin } from './supabase';

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: (stats: UserStats) => boolean;
}

interface UserStats {
  xp: number;
  streak: number;
  quizCount: number;
  flashcardCount: number;
  paperCount: number;
  lectureCount: number;
  perfectQuiz: boolean; 
  nightStudy: boolean; 
}

export const BADGES: Badge[] = [
  // Streak badges
  { id: 'streak_3', name: 'On a Roll', emoji: '🔥', description: '3-day study streak', condition: s => s.streak >= 3 },
  { id: 'streak_7', name: 'Week Warrior', emoji: '⚡', description: '7-day study streak', condition: s => s.streak >= 7 },
  { id: 'streak_30', name: 'Iron Scholar', emoji: '🗿', description: '30-day study streak', condition: s => s.streak >= 30 },
  
  // XP badges
  { id: 'xp_1000', name: 'Rising Star', emoji: '⭐', description: 'Earned 1,000 XP', condition: s => s.xp >= 1000 },
  { id: 'xp_10000', name: 'Knowledge Seeker', emoji: '🎓', description: 'Earned 10,000 XP', condition: s => s.xp >= 10000 },
  { id: 'xp_100000', name: 'Legend', emoji: '👑', description: 'Earned 100,000 XP', condition: s => s.xp >= 100000 },
  
  // Quiz badges
  { id: 'quiz_10', name: 'Quiz Rookie', emoji: '📝', description: 'Completed 10 quizzes', condition: s => s.quizCount >= 10 },
  { id: 'quiz_100', name: 'Quiz Champion', emoji: '🏆', description: 'Completed 100 quizzes', condition: s => s.quizCount >= 100 },
  { id: 'perfect', name: 'Perfectionist', emoji: '💯', description: '100% on a quiz', condition: s => s.perfectQuiz },
  
  // Flashcard badges
  { id: 'fc_100', name: 'Card Shark', emoji: '🃏', description: 'Reviewed 100 flashcards', condition: s => s.flashcardCount >= 100 },
  { id: 'fc_1000', name: 'Memory Master', emoji: '🧠', description: 'Reviewed 1,000 flashcards', condition: s => s.flashcardCount >= 1000 },
  
  // Paper badges
  { id: 'paper_5', name: 'Exam Veteran', emoji: '📋', description: 'Completed 5 past papers', condition: s => s.paperCount >= 5 },
  
  // Special badges
  { id: 'night_owl', name: 'Night Owl', emoji: '🦉', description: 'Studied after 11pm', condition: s => s.nightStudy },
  { id: 'all_courses', name: 'Polymath', emoji: '🌟', description: 'Studied 5+ courses', condition: s => s.lectureCount >= 5 },
];

export async function checkAndAwardBadges(userId: string) {
  // Gather stats
  const [profile, quizzes, flashcards, papers, sessions, courses] = await Promise.all([
    supabaseAdmin.from('profiles').select('xp,streak').eq('id', userId).single(),
    supabaseAdmin.from('quiz_attempts').select('score', { count: 'exact' }).eq('user_id', userId),
    supabaseAdmin.from('flashcards').select('repetitions').eq('user_id', userId).gt('repetitions', 0),
    supabaseAdmin.from('past_paper_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true),
    supabaseAdmin.from('study_sessions').select('started_at').eq('user_id', userId),
    supabaseAdmin.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  ]);

  const stats: UserStats = {
    xp: profile.data?.xp || 0,
    streak: profile.data?.streak || 0,
    quizCount: quizzes.count || 0,
    flashcardCount: (flashcards.data || []).reduce((s: any, f: any) => s + f.repetitions, 0),
    paperCount: papers.count || 0,
    lectureCount: courses.count || 0,
    perfectQuiz: (quizzes.data || []).some((q: any) => q.score >= 99),
    nightStudy: (sessions.data || []).some((s: any) => new Date(s.started_at).getHours() >= 23),
  };

  // Get already-earned badges
  const { data: earned } = await supabaseAdmin.from('achievements').select('badge').eq('user_id', userId);
  const earnedIds = new Set((earned || []).map((a: any) => a.badge));

  // Check and award new badges
  const newBadges = [];
  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && badge.condition(stats)) {
      await supabaseAdmin.from('achievements').insert({ user_id: userId, badge: badge.id });
      newBadges.push(badge);
    }
  }

  return newBadges;
}
