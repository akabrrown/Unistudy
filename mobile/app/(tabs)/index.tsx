import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const styles = getStyles(colors, theme === 'dark');
  const { user, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [randomQuote] = useState(() => {
    const quotes = [
      "Ready for another productive session?",
      "Every study session counts!",
      "Keep up the great work!",
      "Time to level up your knowledge.",
      "Let's make today count."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    async function fetchData() {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      setProfile(profileData);

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*, lectures(id)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);
        
      setCourses(coursesData || []);
      setLoading(false);
    }

    fetchData();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const displayUsername = profile?.username ? `@${profile.username}` : (profile?.full_name?.split(' ')[0] || 'Student');
  
  const hour = new Date().getHours();
  const timeEmoji = hour >= 6 && hour < 18 ? '☀️' : '🌙';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <Text style={styles.greeting}>Greetings, {displayUsername} {timeEmoji}</Text>
          <Text style={styles.subtitle}>{randomQuote}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.captureCard}
        onPress={() => router.push('/camera')}
      >
        <View style={styles.captureIconContainer}>
          <Ionicons name="camera" size={32} color="#fff" />
        </View>
        <View style={styles.captureTextContainer}>
          <Text style={styles.captureTitle}>Quick Capture</Text>
          <Text style={styles.captureSubtitle}>Snap a whiteboard or slide for AI explanation.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Due Today</Text>
      
      <View style={styles.dueCard}>
        <View style={styles.dueLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="albums" size={24} color={colors.tint} />
          </View>
          <View>
            <Text style={styles.dueTitle}>Daily Reviews</Text>
            <Text style={styles.dueSubtitle}>Check Flashcards tab</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.studyBtn}
          onPress={() => router.push('/flashcards')}
        >
          <Text style={styles.studyBtnText}>Study</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Courses</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {courses.length === 0 ? (
          <View style={styles.emptyCourseCard}>
            <Text style={styles.emptyCourseText}>No courses created yet.</Text>
            <Text style={styles.emptyCourseSubtext}>Create one on the web app!</Text>
          </View>
        ) : (
          courses.map((course, i) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={[styles.courseIcon, { backgroundColor: i % 2 === 0 ? (theme === 'dark' ? '#3B1D5E' : '#E8DEF8') : (theme === 'dark' ? '#0B2D70' : '#D3E3FD') }]}>
                <Ionicons name={i % 2 === 0 ? 'flask' : 'code'} size={24} color={i % 2 === 0 ? (theme === 'dark' ? '#B39DDB' : '#5B2D8E') : (theme === 'dark' ? '#90CAF9' : '#0B57D0')} />
              </View>
              <Text style={styles.courseTitle} numberOfLines={1}>{course.course_code || course.title}</Text>
              <Text style={styles.courseSubtitle}>{course.lectures?.length || 0} Lectures</Text>
            </View>
          ))
        )}
      </ScrollView>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  leftHeader: {
    alignItems: 'flex-start',
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#4E342E' : '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  streakText: {
    color: colors.warning,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  captureCard: {
    backgroundColor: colors.tint,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 32,
  },
  captureIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  captureTextContainer: {
    flex: 1,
  },
  captureTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  captureSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  dueCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 32,
  },
  dueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  dueSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  studyBtn: {
    backgroundColor: colors.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  studyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  horizontalScroll: {
    overflow: 'visible',
  },
  courseCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCourseCard: {
    backgroundColor: colors.input,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCourseText: {
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  emptyCourseSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  courseSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  }
});
