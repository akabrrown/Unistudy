import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useQuery, usePowerSync } from '@powersync/react-native';
import { supabase } from '../../lib/supabase';
import { Colors, useThemeColors } from '../../constants/Colors';
import NetInfo from '@react-native-community/netinfo';
import { isCourseDownloaded, downloadCourse, removeDownloadedCourse } from '../../lib/sync';
import { getDb } from '../../lib/db';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../utils/cloudinary';

export default function CourseDetailScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const powersync = usePowerSync();
  const { data: coursesData, isLoading: isCourseLoading } = useQuery('SELECT * FROM courses WHERE id = ?', [courseId]);
  const course = coursesData?.[0];

  const { data: lectures, isLoading: isLecturesLoading } = useQuery('SELECT * FROM lectures WHERE course_id = ? ORDER BY created_at DESC', [courseId]);

  const loading = isCourseLoading || (isLecturesLoading && lectures.length === 0);
  const [downloading, setDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const { user } = useAuth();

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const checkDownloaded = async () => {
    const downloaded = await isCourseDownloaded(courseId);
    setIsDownloaded(downloaded);
  };

  useEffect(() => {
    if (courseId) checkDownloaded();
  }, [courseId]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handleUploadLecture = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      // 1. Create Placeholder
      const { data: newLecture, error: insertError } = await supabase
        .from('lectures')
        .insert({
          course_id: courseId,
          title: selectedFile.name,
          file_url: '',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Upload to Cloudinary
      const formDataCloudinary = new FormData();
      formDataCloudinary.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf',
      } as any);
      formDataCloudinary.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
      const cloudRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formDataCloudinary,
      });

      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Failed to upload to Cloudinary');

      // 3. Update Lecture
      await supabase
        .from('lectures')
        .update({ file_url: cloudData.secure_url })
        .eq('id', newLecture.id);

      // 4. Send to FastAPI
      setIsUploading(false);
      setIsProcessing(true);

      const formDataFastAPI = new FormData();
      formDataFastAPI.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf',
      } as any);
      formDataFastAPI.append('lecture_id', newLecture.id);
      formDataFastAPI.append('user_id', user.id);

      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const fastApiUrl = localIp 
        ? `http://${localIp}:8000/convert` 
        : (Platform.OS === 'android' ? 'http://10.0.2.2:8000/convert' : 'http://localhost:8000/convert');

      const convertRes = await fetch(fastApiUrl, {
        method: 'POST',
        body: formDataFastAPI,
      });

      if (!convertRes.ok) {
        const errText = await convertRes.text();
        throw new Error(`Conversion failed: ${errText}`);
      }

      Alert.alert('Success', 'Lecture uploaded and processed successfully!');
      setUploadModalVisible(false);
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const deleteLecture = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this lecture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await powersync.execute('DELETE FROM lectures WHERE id = ?', [id]);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const handleLectureOptions = (lecture: any) => {
    Alert.alert(
      lecture.title || 'Lecture Options',
      'Choose an action',
      [
        { text: 'Delete', onPress: () => deleteLecture(lecture.id), style: 'destructive' },
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
      router.push(`/lecture/${item.id}`);
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
    Alert.alert('Bulk Delete', `Are you sure you want to delete ${selectedIds.length} lecture${selectedIds.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            for (const id of selectedIds) {
              await powersync.execute('DELETE FROM lectures WHERE id = ?', [id]);
            }
            setSelectionMode(false);
            setSelectedIds([]);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

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
          renderItem={({ item, index }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity 
                style={[styles.lectureCard, isSelected && { borderColor: colors.tint, borderWidth: 2 }]} 
                onPress={() => handlePress(item)}
                onLongPress={() => handleLongPress(item)}
              >
                <View style={styles.lectureNumber}>
                  {selectionMode ? (
                    <Ionicons 
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                      size={24} 
                      color={isSelected ? colors.tint : colors.textMuted} 
                    />
                  ) : (
                    <Text style={styles.lectureNumberText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.lectureInfo}>
                  <Text style={styles.lectureTitle} numberOfLines={1}>{item.title || `Lecture ${index + 1}`}</Text>
                  <Text style={styles.lectureDate}>
                    {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                {!selectionMode && (
                  <TouchableOpacity onPress={() => handleLectureOptions(item)} style={{ padding: 8, margin: -8 }}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
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
          onPress={() => setUploadModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Upload Modal */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent={true} onRequestClose={() => setUploadModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Lecture</Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Select a PDF or PPTX file. We will extract the slides and prepare them for AI processing.
            </Text>

            <TouchableOpacity 
              style={[styles.pickerBtn, { borderColor: colors.tint, backgroundColor: isDark ? '#222' : '#f9f9f9' }]} 
              onPress={handlePickFile}
              disabled={isUploading || isProcessing}
            >
              <Ionicons name="cloud-upload-outline" size={32} color={colors.tint} style={{ marginBottom: 8 }} />
              <Text style={[styles.pickerBtnText, { color: colors.text }]}>
                {selectedFile ? selectedFile.name : 'Tap to select file'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.uploadBtn, { backgroundColor: colors.tint, opacity: (!selectedFile || isUploading || isProcessing) ? 0.6 : 1 }]} 
              onPress={handleUploadLecture}
              disabled={!selectedFile || isUploading || isProcessing}
            >
              {(isUploading || isProcessing) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.uploadBtnText}>
                    {isProcessing ? 'Processing AI...' : 'Uploading...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.uploadBtnText}>Upload & Process</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  pickerBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  pickerBtnText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  uploadBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
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
  },
});
