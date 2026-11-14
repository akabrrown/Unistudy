import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSettings } from '../lib/SettingsContext';
import { apiFetch } from '../lib/api';
import { resolveCourseColor } from '../lib/constants/courses';
import { Ionicons } from '@expo/vector-icons';

interface LectureItem {
  id: string;
  course_id: string;
  title: string;
  week?: number | null;
  slide_count?: number | null;
  created_at?: string | null;
  course_code?: string;
  course_title?: string;
  course_colour?: string;
}

interface CourseItem {
  id: string;
  course_code: string;
  title: string;
  colour?: string;
  lectures?: { id: string; title: string; week?: number; slide_count?: number; created_at?: string }[];
}

export default function LecturesHubScreen() {
  const { colors } = useSettings();
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLecturesData = useCallback(async () => {
    try {
      const data = await apiFetch('/courses');
      if (Array.isArray(data)) {
        setCourses(data);
        if (params.courseId && data.some(c => c.id === params.courseId)) {
          setSelectedCourseId(params.courseId);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch courses for lectures hub:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.courseId]);

  useEffect(() => {
    fetchLecturesData();
  }, [fetchLecturesData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLecturesData();
  };

  // Flatten all lectures with their parent course metadata
  const allLectures: LectureItem[] = useMemo(() => {
    const list: LectureItem[] = [];
    courses.forEach(c => {
      if (Array.isArray(c.lectures)) {
        c.lectures.forEach(l => {
          list.push({
            id: l.id,
            course_id: c.id,
            title: l.title || 'Untitled Lecture',
            week: l.week,
            slide_count: l.slide_count,
            created_at: l.created_at,
            course_code: c.course_code || 'COURSE',
            course_title: c.title,
            course_colour: c.colour,
          });
        });
      }
    });
    return list;
  }, [courses]);

  // Filter lectures based on course selection & search query
  const filteredLectures = useMemo(() => {
    return allLectures.filter(l => {
      const matchesCourse = selectedCourseId === 'all' || l.course_id === selectedCourseId;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.title.toLowerCase().includes(q) ||
        (l.course_code && l.course_code.toLowerCase().includes(q)) ||
        (l.course_title && l.course_title.toLowerCase().includes(q)) ||
        (l.week !== undefined && l.week !== null && `week ${l.week}`.includes(q));
      return matchesCourse && matchesSearch;
    });
  }, [allLectures, selectedCourseId, searchQuery]);

  const renderLectureCard = ({ item }: { item: LectureItem }) => {
    const ribbonColor = resolveCourseColor(item.course_colour);

    return (
      <View style={[styles.lectureCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={[styles.colorRibbon, { backgroundColor: ribbonColor }]} />
        <View style={styles.cardInner}>
          {/* Header Row: Course Code & Week */}
          <View style={styles.cardHeader}>
            <View style={styles.courseBadge}>
              <View style={[styles.colorDot, { backgroundColor: ribbonColor }]} />
              <Text style={[styles.courseCodeText, { color: ribbonColor }]}>{item.course_code}</Text>
            </View>

            {item.week && (
              <View style={[styles.weekPill, { backgroundColor: colors.bgSubtle }]}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.weekPillText, { color: colors.textSecondary }]}>Week {item.week}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.lectureTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Course Name */}
          <Text style={[styles.courseName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.course_title}
          </Text>

          {/* Footer Actions */}
          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            <View style={styles.slideCountWrap}>
              <Ionicons name="easel-outline" size={14} color={colors.textMuted} style={{ marginRight: 5 }} />
              <Text style={[styles.slideCountText, { color: colors.textSecondary }]}>
                {item.slide_count ? `${item.slide_count} Slides` : 'Interactive Deck'}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.openDeckBtn, { backgroundColor: colors.primaryViolet }]}
                onPress={() => router.push({ pathname: '/lecture/[lectureId]', params: { lectureId: item.id } })}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.openDeckBtnText}>Study Slides</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Recent Lectures</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {allLectures.length} lecture {allLectures.length === 1 ? 'deck' : 'decks'} across {courses.length} courses
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search lectures, topics, or course codes..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Course Filter Horizontal Scroll */}
      <View style={styles.courseFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseFilterScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedCourseId === 'all' ? colors.primaryViolet : colors.bgCard,
                borderColor: selectedCourseId === 'all' ? colors.primaryViolet : colors.border,
              },
            ]}
            onPress={() => setSelectedCourseId('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedCourseId === 'all' ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' },
              ]}
            >
              All Courses ({allLectures.length})
            </Text>
          </TouchableOpacity>

          {courses.map(c => {
            const isSelected = selectedCourseId === c.id;
            const ribbonColor = resolveCourseColor(c.colour);
            const count = Array.isArray(c.lectures) ? c.lectures.length : 0;

            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primaryViolet : colors.bgCard,
                    borderColor: isSelected ? colors.primaryViolet : colors.border,
                  },
                ]}
                onPress={() => setSelectedCourseId(c.id)}
              >
                <View style={[styles.miniDot, { backgroundColor: isSelected ? '#FFFFFF' : ribbonColor }]} />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary, fontWeight: isSelected ? '700' : '500' },
                  ]}
                >
                  {c.course_code || 'Course'} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryViolet} />
        </View>
      ) : filteredLectures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="easel-outline" size={40} color={colors.primaryViolet} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No lectures found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchQuery
              ? 'No lecture decks matched your search keywords.'
              : 'Choose another course or upload presentation slides to begin studying.'}
          </Text>
          <TouchableOpacity
            style={[styles.emptyActionBtn, { backgroundColor: colors.primaryViolet }]}
            onPress={() => {
              setSelectedCourseId('all');
              setSearchQuery('');
            }}
          >
            <Text style={styles.emptyActionText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredLectures}
          keyExtractor={item => item.id}
          renderItem={renderLectureCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryViolet} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  courseFilterContainer: {
    marginBottom: 14,
  },
  courseFilterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  lectureCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  colorRibbon: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
  },
  cardInner: {
    padding: 16,
    paddingLeft: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  courseCodeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  weekPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  lectureTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  courseName: {
    fontSize: 13,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  slideCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  openDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  openDeckBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

