import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import NetInfo from '@react-native-community/netinfo';
import { isCourseDownloaded, downloadCourse, removeDownloadedCourse } from '../../lib/sync';
import { getDb } from '../../lib/db';

export default function CourseDetailScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const [course, setCourse] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    async function fetchCourseData() {
      const netInfo = await NetInfo.fetch();
      const downloaded = await isCourseDownloaded(courseId);
      setIsDownloaded(downloaded);

      if (!netInfo.isConnected || downloaded) {
        // Load from local database
        const db = await getDb();
        const localCourse = await db.getFirstAsync('SELECT * FROM downloaded_courses WHERE id = ?', [courseId]);
        if (localCourse) {
          setCourse(localCourse);
          const localLectures = await db.getAllAsync('SELECT * FROM downloaded_lectures WHERE course_id = ?', [courseId]);
          // Add created_at mock for sorting if missing
          const mappedLectures = (localLectures as any[]).map(l => ({ ...l, created_at: new Date().toISOString() }));
          setLectures(mappedLectures);
          setLoading(false);
          return;
        }
      }

      if (netInfo.isConnected) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        setCourse(courseData);

        const { data: lectureData } = await supabase
          .from('lectures')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });

        setLectures(lectureData || []);
      }
      setLoading(false);
    }

    if (courseId) fetchCourseData();
  }, [courseId]);

  const handleDownloadToggle = async () => {
    if (isDownloaded) {
      const success = await removeDownloadedCourse(courseId);
      if (success) setIsDownloaded(false);
    } else {
      setDownloading(true);
      try {
        await downloadCourse(courseId);
        setIsDownloaded(true);
      } catch (err) {
        console.error(err);
      }
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Course not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.downloadBtn, isDownloaded && styles.downloadedBtn]} 
            onPress={handleDownloadToggle}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons 
                name={isDownloaded ? "checkmark-circle" : "cloud-download-outline"} 
                size={22} 
                color={isDownloaded ? "#4CAF50" : colors.tint} 
              />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.courseCode}>{course.course_code || 'Course'}</Text>
          <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
          <Text style={styles.lectureCount}>{lectures.length} lecture{lectures.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Lectures list */}
      {lectures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No lectures yet</Text>
          <Text style={styles.emptySubtext}>Upload lecture materials on the web app to see them here.</Text>
        </View>
      ) : (
        <FlatList
          data={lectures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.lectureCard} onPress={() => router.push(`/lecture/${item.id}`)}>
              <View style={styles.lectureNumber}>
                <Text style={styles.lectureNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.lectureInfo}>
                <Text style={styles.lectureTitle} numberOfLines={1}>{item.title || `Lecture ${index + 1}`}</Text>
                <Text style={styles.lectureDate}>
                  {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  downloadBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 75, 180, 0.1)',
  },
  downloadedBtn: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  headerInfo: {},
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tint,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  lectureCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  list: {
    padding: 20,
  },
  lectureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  lectureNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  lectureNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.tint,
  },
  lectureInfo: {
    flex: 1,
  },
  lectureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  lectureDate: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
