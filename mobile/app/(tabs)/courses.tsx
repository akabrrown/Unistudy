import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useQuery, usePowerSync } from '@powersync/react-native';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import { Colors, useThemeColors } from '../../constants/Colors';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CoursesScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const powersync = usePowerSync();
  const { data: courses = [] } = useQuery('SELECT * FROM courses ORDER BY created_at DESC');
  const loading = false;
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseSemester, setNewCourseSemester] = useState('1');
  const [newCourseYear, setNewCourseYear] = useState(new Date().getFullYear().toString());
  const [newCourseColor, setNewCourseColor] = useState('#5B2D8E');
  const [isCreating, setIsCreating] = useState(false);
  
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, isDark, insets);

  useEffect(() => {
    // Left intentionally blank - useQuery handles the data fetching now
  }, [user, authLoading]);

  const fetchCourses = async () => {
    // Handled automatically by PowerSync useQuery hook
  };

  const handleSaveCourse = async () => {
    if (!newCourseCode.trim() || !newCourseTitle.trim()) {
      Alert.alert('Error', 'Please fill in both Course Code and Title.');
      return;
    }
    
    setIsCreating(true);
    try {
      if (editingCourseId) {
        await powersync.execute(
          'UPDATE courses SET course_code = ?, title = ?, semester = ?, year = ?, colour = ? WHERE id = ?',
          [newCourseCode.trim(), newCourseTitle.trim(), parseInt(newCourseSemester) || 1, parseInt(newCourseYear) || new Date().getFullYear(), newCourseColor, editingCourseId]
        );
      } else {
        await powersync.execute(
          'INSERT INTO courses (id, user_id, course_code, title, semester, year, colour, archived) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
          [Crypto.randomUUID(), user?.id, newCourseCode.trim(), newCourseTitle.trim(), parseInt(newCourseSemester) || 1, parseInt(newCourseYear) || new Date().getFullYear(), newCourseColor]
        );
      }
      
      setCreateModalVisible(false);
      setEditingCourseId(null);
      setNewCourseCode('');
      setNewCourseTitle('');
      setNewCourseSemester('1');
      setNewCourseYear(new Date().getFullYear().toString());
      setNewCourseColor('#5B2D8E');
      fetchCourses();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteCourse = async (id: string) => {
    Alert.alert('Delete Course', 'Are you sure you want to delete this course?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await powersync.execute('DELETE FROM courses WHERE id = ?', [id]);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
      }}
    ]);
  };

  const openEditModal = (course: any) => {
    setEditingCourseId(course.id);
    setNewCourseCode(course.course_code || '');
    setNewCourseTitle(course.title || '');
    setNewCourseSemester(course.semester?.toString() || '1');
    setNewCourseYear(course.year?.toString() || new Date().getFullYear().toString());
    setNewCourseColor(course.colour || '#5B2D8E');
    setCreateModalVisible(true);
  };

  const handleCourseOptions = (course: any) => {
    Alert.alert(
      course.title || course.course_code || 'Course Options',
      'Choose an action',
      [
        { text: 'Edit', onPress: () => openEditModal(course) },
        { text: 'Delete', onPress: () => deleteCourse(course.id), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(i => i !== id);
        if (next.length === 0) setSelectionMode(false);
        return next;
      }
      return [...prev, id];
    });
  };

  const handlePress = (item: any) => {
    if (selectionMode) {
      toggleSelection(item.id);
    } else {
      router.push(`/course/${item.id}`);
    }
  };

  const handleLongPress = (item: any) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds([item.id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert('Bulk Delete', `Are you sure you want to delete ${selectedIds.length} course${selectedIds.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const placeholders = selectedIds.map(() => '?').join(',');
            await powersync.execute(`DELETE FROM courses WHERE id IN (${placeholders})`, selectedIds);
            
            // Also delete associated lectures (cascade usually handles this on the server, but doing it locally ensures immediate UI update if cascading isn't set up on the client schema)
            await powersync.execute(`DELETE FROM lectures WHERE course_id IN (${placeholders})`, selectedIds);
            
            setSelectionMode(false);
            setSelectedIds([]);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const color = item.colour || '#5B2D8E';
    const icon = 'library';
    const isSelected = selectedIds.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && { borderColor: colors.tint, borderWidth: 2 }]} 
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            {selectionMode ? (
              <Ionicons 
                name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                size={28} 
                color={isSelected ? colors.tint : colors.textMuted} 
              />
            ) : (
              <Ionicons name={icon as any} size={28} color={color} />
            )}
          </View>
          {!selectionMode && (
            <TouchableOpacity onPress={() => handleCourseOptions(item)} style={{ padding: 8, margin: -8 }}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>{item.course_code || 'Course'}</Text>
        <Text style={styles.subtitle}>{item.title}</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
          {item.lectures?.length || 0} lecture{item.lectures?.length !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading || authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Courses Found</Text>
          <Text style={styles.emptySubtext}>Head over to the web app to create your first course!</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB or Bulk Actions */}
      {selectionMode ? (
        <View style={styles.bulkActionsContainer}>
          <TouchableOpacity 
            style={[styles.bulkBtn, { backgroundColor: colors.card }]}
            onPress={() => {
              setSelectionMode(false);
              setSelectedIds([]);
            }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
            <Text style={{ color: colors.text, marginLeft: 8, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.bulkBtn, { backgroundColor: '#F44336', opacity: selectedIds.length === 0 ? 0.5 : 1 }]}
            onPress={handleBulkDelete}
            disabled={selectedIds.length === 0}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '600' }}>Delete ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => {
            setEditingCourseId(null);
            setNewCourseCode('');
            setNewCourseTitle('');
            setNewCourseSemester('1');
            setNewCourseYear(new Date().getFullYear().toString());
            setNewCourseColor('#5B2D8E');
            setCreateModalVisible(true);
          }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Course Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCourseId ? 'Edit Course' : 'Create New Course'}</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.label, { color: colors.text }]}>Course Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0', color: colors.text }]}
              placeholder="e.g. CS101"
              placeholderTextColor={colors.textMuted}
              value={newCourseCode}
              onChangeText={setNewCourseCode}
              autoCapitalize="characters"
            />
            
            <Text style={[styles.label, { color: colors.text }]}>Course Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0', color: colors.text }]}
              placeholder="e.g. Intro to Computer Science"
              placeholderTextColor={colors.textMuted}
              value={newCourseTitle}
              onChangeText={setNewCourseTitle}
            />


            <Text style={[styles.label, { color: colors.text }]}>Course Colour</Text>
            <View style={styles.colorPickerContainer}>
              {['#5B2D8E', '#7B4DB5', '#9B72CF', '#E91E63', '#0B57D0', '#FF5722', '#4CAF50'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c, borderColor: newCourseColor === c ? colors.text : 'transparent' }]}
                  onPress={() => setNewCourseColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.createBtn, { backgroundColor: colors.tint, opacity: isCreating ? 0.7 : 1 }]} 
              onPress={handleSaveCourse}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createBtnText}>{editingCourseId ? 'Save Changes' : 'Create Course'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 20,
    paddingTop: Math.max(insets.top + 20, 60),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.input,
    borderRadius: 4,
    marginRight: 12,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    width: 36,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 4,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  createBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bulkActionsContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  bulkBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: 8,
  }
});
