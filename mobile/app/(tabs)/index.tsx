import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useSettings } from '../../lib/SettingsContext';
import { apiFetch } from '../../lib/api';
import { getCuratedDailyQuote } from '../../lib/constants/quotes';
import { resolveCourseColor } from '../../lib/constants/courses';
import { OfflineManager } from '../../lib/offline';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const dailyQuote = getCuratedDailyQuote();

  const loadDashboardData = useCallback(async () => {
    try {
      const [coursesRes, examsRes] = await Promise.allSettled([
        apiFetch('/courses'),
        apiFetch('/calendar/events?type=exam&limit=4'),
      ]);

      if (coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value)) {
        setCourses(coursesRes.value);
        OfflineManager.cacheCourses(coursesRes.value);
      } else {
        // Fallback to offline cache
        const cached = await OfflineManager.getCachedCourses();
        if (cached.length > 0) setCourses(cached);
      }

      if (examsRes.status === 'fulfilled' && Array.isArray(examsRes.value)) {
        setUpcomingExams(examsRes.value);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
      const cached = await OfflineManager.getCachedCourses();
      if (cached.length > 0) setCourses(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Scholar';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryViolet} />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()}, {displayName} 👋
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Your Study Desk</Text>
            {profile?.institution_name && (
              <View style={styles.institutionBadge}>
                <Ionicons name="school" size={13} color={colors.primaryViolet} style={{ marginRight: 4 }} />
                <Text style={[styles.institutionText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {profile.institution_name}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.profileAvatar, { backgroundColor: colors.bgSubtle, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={[styles.avatarInitial, { color: colors.primaryViolet }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Anxiety & Study Mood Check-In */}
        <View style={[styles.moodCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>How are you feeling today?</Text>
          <View style={styles.moodRow}>
            {[
              { id: 'confident', emoji: '💪', label: 'Confident' },
              { id: 'calm', emoji: '😌', label: 'Calm' },
              { id: 'anxious', emoji: '😰', label: 'Anxious' },
              { id: 'overwhelmed', emoji: '🤯', label: 'Tired' },
            ].map(mood => {
              const active = selectedMood === mood.id;
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodItem,
                    {
                      backgroundColor: active ? colors.primaryViolet + '25' : colors.bgSubtle,
                      borderColor: active ? colors.primaryViolet : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedMood(mood.id)}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: active ? colors.primaryViolet : colors.textSecondary }]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Daily Motivational Quote */}
        <View style={[styles.quoteCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.quoteHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primaryViolet} style={{ marginRight: 6 }} />
            <Text style={[styles.quoteBadgeText, { color: colors.primaryViolet }]}>Daily Inspiration</Text>
          </View>
          <Text style={[styles.quoteText, { color: colors.textPrimary }]}>"{dailyQuote.quote}"</Text>
          <Text style={[styles.quoteAuthor, { color: colors.textSecondary }]}>— {dailyQuote.author}</Text>
        </View>

        {/* Study Stats / Effort Tracker */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="flame" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile?.streak_days || 1} Days</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Study Streak</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="book" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{courses.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Modules</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: '#8C52FF20' }]}>
              <Ionicons name="ribbon" size={20} color="#8C52FF" />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile?.study_points || 0} XP</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Knowledge Points</Text>
          </View>
        </View>

        {/* Quick Action Tools */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Tools</Text>
        </View>
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => router.push('/calculator')}
          >
            <View style={[styles.toolIconWrap, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="calculator" size={22} color="#3B82F6" />
            </View>
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>AI Math</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => router.push('/camera')}
          >
            <View style={[styles.toolIconWrap, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="scan" size={22} color="#10B981" />
            </View>
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Scan Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => router.push('/essay-grader')}
          >
            <View style={[styles.toolIconWrap, { backgroundColor: '#EC489920' }]}>
              <Ionicons name="document-text" size={22} color="#EC4899" />
            </View>
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Grade Essay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/flashcards')}
          >
            <View style={[styles.toolIconWrap, { backgroundColor: '#8C52FF20' }]}>
              <Ionicons name="albums" size={22} color="#8C52FF" />
            </View>
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Flashcards</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Exams Card */}
        {upcomingExams.length > 0 && (
          <View style={[styles.examsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.examsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Upcoming Exams</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/study-calendar')}>
                <Text style={{ fontSize: 13, color: colors.primaryViolet, fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </View>

            {upcomingExams.map(exam => (
              <View key={exam.id} style={[styles.examItem, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.examTitle, { color: colors.textPrimary }]}>{exam.title}</Text>
                  <Text style={[styles.examDate, { color: colors.textSecondary }]}>
                    {new Date(exam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.examTag}>
                  <Text style={styles.examTagText}>Exam</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Courses Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Courses</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/courses')}>
            <Text style={[styles.seeAllText, { color: colors.primaryViolet }]}>View All ({courses.length})</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primaryViolet} style={{ marginVertical: 24 }} />
        ) : courses.length === 0 ? (
          <View style={[styles.emptyCoursesCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBadge, { backgroundColor: colors.bgSubtle }]}>
              <Ionicons name="book-outline" size={32} color={colors.primaryViolet} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No active courses yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Organize your materials by adding your first university course.
            </Text>
            <TouchableOpacity
              style={[styles.addCourseBtn, { backgroundColor: colors.primaryViolet }]}
              onPress={() => router.push('/(tabs)/courses')}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addCourseBtnText}>Add Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.coursesList}>
            {courses.slice(0, 3).map(course => {
              const ribbonColor = resolveCourseColor(course.colour);
              return (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.courseCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/course/[courseId]', params: { courseId: course.id } })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.colorRibbon, { backgroundColor: ribbonColor }]} />
                  <View style={styles.courseCardBody}>
                    <View style={styles.courseCardHeader}>
                      <Text style={[styles.courseCode, { color: ribbonColor }]}>
                        {course.course_code || 'COURSE'}
                      </Text>
                      {course.semester && (
                        <View style={[styles.semesterBadge, { backgroundColor: colors.bgSubtle }]}>
                          <Text style={[styles.semesterText, { color: colors.textSecondary }]}>
                            Sem {course.semester}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.courseTitleText, { color: colors.textPrimary }]} numberOfLines={2}>
                      {course.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  institutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  institutionText: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 220,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  moodCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  moodItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  quoteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  quoteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 6,
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  toolBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  examsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  examsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  examItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  examTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  examDate: {
    fontSize: 12,
  },
  examTag: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  examTagText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCoursesCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 240,
  },
  addCourseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addCourseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  colorRibbon: {
    width: 6,
  },
  courseCardBody: {
    flex: 1,
    padding: 14,
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  semesterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  semesterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  courseTitleText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
