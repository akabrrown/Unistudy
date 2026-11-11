import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '../../lib/SettingsContext';
import { apiFetch } from '../../lib/api';
import { resolveCourseColor } from '../../lib/constants/courses';
import { Ionicons } from '@expo/vector-icons';

interface Lecture {
  id: string;
  course_id: string;
  title: string;
  lecture_number?: number;
  slide_count?: number;
  slides?: any[];
  created_at?: string;
}

interface CourseDetails {
  id: string;
  course_code: string;
  title: string;
  semester?: number;
  year?: number;
  colour?: string;
  lectures?: Lecture[];
}

export default function CourseDetailsScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { colors } = useSettings();
  const router = useRouter();

  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    try {
      const [courseData, lecturesData] = await Promise.allSettled([
        apiFetch(`/courses/${courseId}`),
        apiFetch(`/lectures?courseId=${courseId}`),
      ]);

      if (courseData.status === 'fulfilled' && courseData.value) {
        setCourse(courseData.value);
      }
      if (lecturesData.status === 'fulfilled' && Array.isArray(lecturesData.value)) {
        setLectures(lecturesData.value);
      }
    } catch (e: any) {
      console.warn('Failed to fetch course details:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourseData();
  };

  const ribbonColor = resolveCourseColor(course?.colour);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPage }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryViolet} />
      }
    >
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primaryViolet} />
        </View>
      ) : !course ? (
        <View style={styles.centerBox}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>Course not found.</Text>
        </View>
      ) : (
        <>
          {/* Course Banner Card */}
          <View style={[styles.bannerCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.colorBannerStripe, { backgroundColor: ribbonColor }]} />
            <View style={styles.bannerContent}>
              <View style={styles.bannerBadgeRow}>
                <View style={[styles.codeBadge, { backgroundColor: ribbonColor + '25' }]}>
                  <Text style={[styles.codeBadgeText, { color: ribbonColor }]}>{course.course_code}</Text>
                </View>
                {course.semester && (
                  <View style={[styles.semesterBadge, { backgroundColor: colors.bgSubtle }]}>
                    <Text style={[styles.semesterText, { color: colors.textSecondary }]}>
                      Semester {course.semester} • {course.year || new Date().getFullYear()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.courseTitle, { color: colors.textPrimary }]}>{course.title}</Text>

              {/* Course Action Shortcut Buttons */}
              <View style={styles.shortcutsRow}>
                <TouchableOpacity
                  style={[styles.shortcutBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.border }]}
                  onPress={() => router.push('/(tabs)/flashcards')}
                >
                  <Ionicons name="albums" size={16} color={colors.primaryViolet} style={{ marginRight: 6 }} />
                  <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Flashcards</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shortcutBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.border }]}
                  onPress={() => router.push('/(tabs)/past-papers')}
                >
                  <Ionicons name="document-text" size={16} color="#EC4899" style={{ marginRight: 6 }} />
                  <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Past Papers</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Lectures Header */}
          <View style={styles.lecturesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Lectures & Slide Decks ({lectures.length})
            </Text>
          </View>

          {/* Lectures List */}
          {lectures.length === 0 ? (
            <View style={[styles.emptyLecturesBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name="documents-outline" size={38} color={colors.primaryViolet} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No lectures uploaded yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Upload course lecture slides or notes via the web portal or scanner tool to begin studying.
              </Text>
            </View>
          ) : (
            <View style={styles.lecturesList}>
              {lectures.map((lecture, idx) => (
                <TouchableOpacity
                  key={lecture.id}
                  style={[styles.lectureCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/lecture/[lectureId]', params: { lectureId: lecture.id } })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.lectureNumberBadge, { backgroundColor: colors.primaryViolet + '20' }]}>
                    <Text style={[styles.lectureNumberText, { color: colors.primaryViolet }]}>
                      {idx + 1}
                    </Text>
                  </View>

                  <View style={styles.lectureInfo}>
                    <Text style={[styles.lectureTitle, { color: colors.textPrimary }]}>
                      {lecture.title || `Lecture ${idx + 1}`}
                    </Text>
                    <View style={styles.lectureMeta}>
                      <Ionicons name="images-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.lectureSlideCount, { color: colors.textSecondary }]}>
                        {lecture.slide_count ? `${lecture.slide_count} Slides` : 'Interactive Slides'}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bannerCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  colorBannerStripe: {
    height: 8,
    width: '100%',
  },
  bannerContent: {
    padding: 20,
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  semesterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  semesterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 16,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  shortcutText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lecturesHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyLecturesBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  lecturesList: {
    gap: 12,
  },
  lectureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  lectureNumberBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  lectureNumberText: {
    fontSize: 15,
    fontWeight: '800',
  },
  lectureInfo: {
    flex: 1,
  },
  lectureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  lectureMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lectureSlideCount: {
    fontSize: 12,
  },
});
