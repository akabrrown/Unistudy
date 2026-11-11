import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettings } from '../../lib/SettingsContext';
import { apiFetch } from '../../lib/api';
import { COURSE_COLORS, resolveCourseColor } from '../../lib/constants/courses';
import { OfflineManager } from '../../lib/offline';
import { Ionicons } from '@expo/vector-icons';

interface Course {
  id: string;
  course_code: string;
  title: string;
  semester?: number;
  year?: number;
  colour?: string;
  lectures?: any[];
}

export default function CoursesScreen() {
  const { colors } = useSettings();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSemester, setCourseSemester] = useState('1');
  const [courseYear, setCourseYear] = useState(new Date().getFullYear().toString());
  const [courseColor, setCourseColor] = useState(COURSE_COLORS[0].hex);
  const [saving, setSaving] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await apiFetch('/courses');
      if (Array.isArray(data)) {
        setCourses(data);
        await OfflineManager.cacheCourses(data);
      }
    } catch (err: any) {
      console.warn('Fetch courses failed, using cache:', err.message);
      const cached = await OfflineManager.getCachedCourses();
      if (cached.length > 0) setCourses(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const openAddModal = () => {
    setEditingCourseId(null);
    setCourseCode('');
    setCourseTitle('');
    setCourseSemester('1');
    setCourseYear(new Date().getFullYear().toString());
    setCourseColor(COURSE_COLORS[0].hex);
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseCode(course.course_code || '');
    setCourseTitle(course.title || '');
    setCourseSemester(course.semester ? course.semester.toString() : '1');
    setCourseYear(course.year ? course.year.toString() : new Date().getFullYear().toString());
    setCourseColor(course.colour || COURSE_COLORS[0].hex);
    setIsModalOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseCode.trim() || !courseTitle.trim()) {
      Alert.alert('Required Fields', 'Please enter both the Course Code and Course Name.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        course_code: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        semester: parseInt(courseSemester, 10) || 1,
        year: parseInt(courseYear, 10) || new Date().getFullYear(),
        colour: courseColor,
      };

      if (editingCourseId) {
        const updated = await apiFetch(`/courses/${editingCourseId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setCourses(prev => prev.map(c => (c.id === editingCourseId ? { ...c, ...payload } : c)));
      } else {
        const newCourse = await apiFetch('/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setCourses(prev => [newCourse, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save course. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete ${course.course_code}? All associated lecture slides and notes will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const previous = [...courses];
            setCourses(prev => prev.filter(c => c.id !== course.id));
            try {
              await apiFetch(`/courses/${course.id}`, { method: 'DELETE' });
            } catch (err: any) {
              setCourses(previous);
              Alert.alert('Error', err.message || 'Failed to delete course');
            }
          },
        },
      ]
    );
  };

  const filteredCourses = courses.filter(c =>
    (c.course_code && c.course_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderCourseItem = ({ item }: { item: Course }) => {
    const ribbonColor = resolveCourseColor(item.colour);
    return (
      <TouchableOpacity
        style={[styles.courseCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/course/[courseId]', params: { courseId: item.id } })}
        activeOpacity={0.7}
      >
        <View style={[styles.topRibbon, { backgroundColor: ribbonColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.codeWrap}>
              <Text style={[styles.courseCodeText, { color: ribbonColor }]}>{item.course_code}</Text>
              {item.semester && (
                <View style={[styles.semesterPill, { backgroundColor: colors.bgSubtle }]}>
                  <Text style={[styles.semesterPillText, { color: colors.textSecondary }]}>
                    Sem {item.semester} • {item.year || new Date().getFullYear()}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => openEditModal(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.courseTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="documents-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {item.lectures ? `${item.lectures.length} Lectures` : 'Explore Slides'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>My Courses</Text>
          <Text style={[styles.moduleCount, { color: colors.textSecondary }]}>
            {courses.length} active {courses.length === 1 ? 'module' : 'modules'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primaryViolet }]}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Course</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {courses.length > 0 && (
        <View style={[styles.searchContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search course code or title..."
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
      )}

      {/* Content List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryViolet} />
        </View>
      ) : filteredCourses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBadge, { backgroundColor: colors.bgSubtle }]}>
            <Ionicons name="book-outline" size={40} color={colors.primaryViolet} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No active courses</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Get started by adding your first course to begin organizing your study materials.
          </Text>
          <TouchableOpacity
            style={[styles.addBtnLarge, { backgroundColor: colors.primaryViolet }]}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addBtnLargeText}>Add Course</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={item => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryViolet} />
          }
        />
      )}

      {/* Add / Edit Course Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingCourseId ? 'Edit Course' : 'Add New Course'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Course Code */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Course Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. CPEN 201"
                  placeholderTextColor={colors.textMuted}
                  value={courseCode}
                  onChangeText={setCourseCode}
                  autoCapitalize="characters"
                />
              </View>

              {/* Course Title */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Course Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. C++ Programming & Data Structures"
                  placeholderTextColor={colors.textMuted}
                  value={courseTitle}
                  onChangeText={setCourseTitle}
                />
              </View>

              {/* Semester & Year */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Semester</Text>
                  <View style={styles.semSelector}>
                    {['1', '2'].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.semBtn,
                          {
                            backgroundColor: courseSemester === s ? colors.primaryViolet : colors.bgInput,
                            borderColor: courseSemester === s ? colors.primaryViolet : colors.border,
                          },
                        ]}
                        onPress={() => setCourseSemester(s)}
                      >
                        <Text style={{ color: courseSemester === s ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }}>
                          Sem {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Academic Year</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="2026"
                    placeholderTextColor={colors.textMuted}
                    value={courseYear}
                    onChangeText={setCourseYear}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Course Color Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Course Color Tag</Text>
                <View style={styles.colorPalette}>
                  {COURSE_COLORS.map(c => {
                    const isSelected = courseColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={c.hex}
                        style={[
                          styles.colorDot,
                          { backgroundColor: c.hex },
                          isSelected && styles.colorDotSelected,
                        ]}
                        onPress={() => setCourseColor(c.hex)}
                      >
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                {editingCourseId && (
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: colors.error + '20', borderColor: colors.error }]}
                    onPress={() => {
                      setIsModalOpen(false);
                      const course = courses.find(c => c.id === editingCourseId);
                      if (course) handleDeleteCourse(course);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primaryViolet }]}
                  onPress={handleSaveCourse}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingCourseId ? 'Save Changes' : 'Create Course'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  moduleCount: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#8C52FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
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
    padding: 32,
  },
  emptyIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  addBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  addBtnLargeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  courseCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  topRibbon: {
    height: 5,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseCodeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  semesterPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  semesterPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    gap: 16,
    paddingBottom: 24,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  semSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  semBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

