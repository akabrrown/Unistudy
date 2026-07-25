import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Modal, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Colors, useThemeColors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';

export default function PastPapersScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const { session } = useAuth();

  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Upload Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [year, setYear] = useState('');
  const [examType, setExamType] = useState('Final');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchPapers = async () => {
    if (!session?.user?.id) return;
    try {
      const { data: userCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', session.user.id);
        
      if (!userCourses || userCourses.length === 0) {
        setPapers([]);
        return;
      }

      const courseIds = userCourses.map(c => c.id);

      const { data, error } = await supabase
        .from('past_papers')
        .select('*, courses(*)')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      if (data) {
        setPapers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [session?.user?.id]);

  const openPdf = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error("Couldn't open PDF", err));
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Error picking document", err);
    }
  };

  const handleUpload = async () => {
    if (!courseCode || !year || !examType || !selectedFile) {
      Alert.alert('Missing Fields', 'Please fill in all fields and select a PDF file.');
      return;
    }

    setUploading(true);
    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const baseUrl = localIp 
        ? `http://${localIp}:8000` 
        : (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');
      
      const formData = new FormData();
      formData.append('courseCode', courseCode);
      formData.append('courseName', courseName);
      formData.append('year', year);
      formData.append('examType', examType);
      
      // Append file
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf'
      } as any);

      const res = await fetch(`${baseUrl}/api/past-papers/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      Alert.alert('Success', 'Past paper uploaded and processed successfully!');
      setModalVisible(false);
      setCourseCode('');
      setCourseName('');
      setYear('');
      setExamType('Final');
      setSelectedFile(null);
      
      setRefreshing(true);
      fetchPapers();
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const grouped: Record<string, any[]> = {};
  papers.forEach(p => {
    const code = Array.isArray(p.courses) ? p.courses[0]?.course_code : p.courses?.course_code;
    const key = code || 'General';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.headerRow}>
          <Text style={styles.title}>Past Papers</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={colors.textMuted} style={{opacity: 0.5}} />
            <Text style={styles.emptyText}>No past papers available for your courses.</Text>
            <TouchableOpacity style={styles.uploadEmptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.uploadEmptyBtnText}>Upload One Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.keys(grouped).map(course => (
            <View key={course} style={styles.courseGroup}>
              <Text style={styles.courseTitle}>{course}</Text>
              {grouped[course].map((paper) => (
                <TouchableOpacity key={paper.id} style={styles.paperCard} onPress={() => openPdf(paper.file_url)}>
                  <View style={styles.iconBox}>
                    <Ionicons name="document-text" size={24} color={colors.tint} />
                  </View>
                  <View style={styles.paperInfo}>
                    <Text style={styles.paperTitle}>{paper.title}</Text>
                    <Text style={styles.paperYear}>{paper.year || 'Unknown Year'}</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.title, { marginBottom: 0 }]}>Upload Past Paper</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Code</Text>
              <TextInput style={styles.input} placeholder="e.g. COMP101" placeholderTextColor={colors.textMuted} value={courseCode} onChangeText={setCourseCode} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Name (Optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. Intro to Computer Science" placeholderTextColor={colors.textMuted} value={courseName} onChangeText={setCourseName} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year</Text>
              <TextInput style={styles.input} placeholder="e.g. 2023" keyboardType="numeric" placeholderTextColor={colors.textMuted} value={year} onChangeText={setYear} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exam Type</Text>
              <View style={styles.pickerRow}>
                {['Midterm', 'Final', 'Quiz'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.typePill, examType === t && styles.typePillActive]} 
                    onPress={() => setExamType(t)}
                  >
                    <Text style={[styles.typePillText, examType === t && styles.typePillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PDF File</Text>
              <TouchableOpacity style={styles.fileButton} onPress={handlePickFile}>
                <Ionicons name={selectedFile ? "document-attach" : "cloud-upload-outline"} size={24} color={colors.tint} />
                <Text style={styles.fileButtonText}>
                  {selectedFile ? selectedFile.name : "Select PDF Document"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.submitButton, uploading && { opacity: 0.7 }]} onPress={handleUpload} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Upload & Process</Text>
              )}
            </TouchableOpacity>
            {uploading && (
              <Text style={styles.processingText}>Extracting questions with AI... this may take a moment.</Text>
            )}
          </ScrollView>
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
  content: {
    padding: 16,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.tint,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadEmptyBtn: {
    backgroundColor: colors.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadEmptyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  courseGroup: {
    marginBottom: 24,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  paperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paperInfo: {
    flex: 1,
  },
  paperTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  paperYear: {
    fontSize: 13,
    color: colors.textMuted,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalContent: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  typePillActive: {
    backgroundColor: colors.tint,
    borderColor: colors.tint,
  },
  typePillText: {
    color: colors.text,
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#fff',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.tint,
    borderRadius: 12,
    padding: 24,
    backgroundColor: isDark ? 'rgba(107, 33, 168, 0.1)' : 'rgba(107, 33, 168, 0.05)',
  },
  fileButtonText: {
    color: colors.tint,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingText: {
    textAlign: 'center',
    color: colors.tint,
    fontSize: 13,
    marginTop: -8,
  }
});
