import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useColorScheme, Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve backend URL for both emulator and physical device
function getBaseUrl(): string {
  const hostUri = Constants?.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split('://')[1].split(':')[0];
    return `http://${ip}:8000`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQuery, usePowerSync } from '@powersync/react-native';
import { Colors, useThemeColors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, theme === 'dark', insets);
  const { user, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const { data: courses = [] } = useQuery('SELECT * FROM courses ORDER BY created_at DESC LIMIT 3');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [quote, setQuote] = useState<{ quote: string, author: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    async function fetchData() {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single();
        
        if (profileData) setProfile(profileData);

        const today = new Date().toISOString().split('T')[0];
        const { data: eventsData } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user?.id)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(3);
          
        if (eventsData) setUpcomingEvents(eventsData);

        // Fetch Quote of the Day from Backend (with timeout)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          // Determine backend URL (backend runs on port 8000)
          const baseUrl = getBaseUrl();

          try {
            const res = await fetch(`${baseUrl}/api/settings/daily-quote`, {
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data?.quote) {
                setQuote({ quote: data.quote, author: data.author });
              } else {
                setQuote({ quote: 'Stay motivated!', author: 'Unistudy' });
              }
            } else {
              console.error('Quote fetch error:', res.status);
              setQuote({ quote: 'Stay motivated!', author: 'Unistudy' });
            }
          } catch (err) {
            console.error('Cards fetch error (exception):', err);
            setQuote({ quote: 'Stay motivated!', author: 'Unistudy' });
          }
        } catch (err) {
          console.log('Dashboard fetch failed (offline mode)');
        }
      } catch (err) {
        console.log('Dashboard fetch failed (offline mode)');
      } finally {
        setLoading(false);
      }
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

  const formatEventDate = (dateString: string, timeString?: string) => {
    const d = new Date(dateString);
    const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!timeString) return datePart;
    const timeParts = timeString.split(':');
    const dTime = new Date();
    dTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
    const timeFormatted = dTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${datePart} at ${timeFormatted}`;
  };

  // Parse YYYY-MM-DD as local date without timezone shift
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getCountdownText = (dateString: string, timeString?: string) => {
    const eventDate = parseDate(dateString);
    if (timeString) {
      const [h, m] = timeString.split(':');
      eventDate.setHours(parseInt(h), parseInt(m), 0, 0);
    }
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Past';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
    if (diffHours > 0) {
      return `in ${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    }
    return 'soon';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exam': return 'document-text';
      case 'assignment': return 'create';
      case 'session': return 'time';
      default: return 'calendar';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <Text style={styles.greeting}>Greetings, {displayUsername} {timeEmoji}</Text>
        </View>
      </View>
      
      {quote && (
        <View style={styles.quoteCard}>
          <Ionicons name="chatbubbles" size={24} color={colors.tint} style={{ marginBottom: 8 }} />
          <Text style={styles.quoteText}>"{quote.quote}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>
      )}

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
          <View style={styles.iconBox}><Ionicons name="albums" size={24} color={colors.tint} /></View>
          <View>
            <Text style={styles.dueTitle}>Daily Reviews</Text>
            <Text style={styles.dueSubtitle}>Check Flashcards tab</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.studyBtn} onPress={() => router.push('/flashcards')}>
          <Text style={styles.studyBtnText}>Study</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
      </View>
      
      {upcomingEvents.length === 0 ? (
        <View style={styles.emptyEventCard}>
          <Text style={styles.emptyEventText}>No upcoming events scheduled.</Text>
        </View>
      ) : (
        upcomingEvents.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventIconBox}>
              <Ionicons name={getEventIcon(event.type)} size={20} color={colors.tint} />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTime}>{formatEventDate(event.date, event.time)} • {getCountdownText(event.date, event.time)}</Text>
            </View>
            <View style={styles.eventTypeBadge}>
              <Text style={styles.eventTypeText}>{event.type}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Courses</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
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

const getStyles = (colors: any, isDark: boolean, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: Math.max(insets.top + 20, 60),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  quoteCard: {
    backgroundColor: isDark ? '#2C2C2C' : '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.tint,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'right',
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
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  eventIconBox: {
    width: 40,
    height: 40,
    backgroundColor: isDark ? '#3B1D5E' : '#F3E8FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 13,
    color: colors.textMuted,
  },
  eventTypeBadge: {
    backgroundColor: isDark ? '#424242' : '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeText: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  emptyEventCard: {
    backgroundColor: isDark ? '#222' : '#F9F9F9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyEventText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  horizontalScroll: {
    overflow: 'visible',
    marginHorizontal: -20, // Negative margin to break out of container padding
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20, // Extra padding for shadows
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
    marginBottom: 8,
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
