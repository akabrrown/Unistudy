import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, TextInput, TouchableOpacity, Image, Linking, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Colors, useThemeColors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useQuery, usePowerSync } from '@powersync/react-native';
import * as Crypto from 'expo-crypto';

export default function YouTubeStudyScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const { session } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  
  const powersync = usePowerSync();
  const { data: pinnedVideos = [] } = useQuery('SELECT * FROM pinned_videos ORDER BY pinned_at DESC');
  const { data: courses = [] } = useQuery('SELECT id, course_code, title FROM courses');
  const loadingPinned = false;

  // Pin Modal State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [videoToPin, setVideoToPin] = useState<any>(null);
  const [pinning, setPinning] = useState(false);

  // Removing fetchPinnedVideos and fetchCourses since useQuery handles them

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const apiUrl = localIp 
        ? `http://${localIp}:3000/api/youtube/search?q=${encodeURIComponent(searchQuery)}` 
        : (require('react-native').Platform.OS === 'android' ? `http://10.0.2.2:3000/api/youtube/search?q=${encodeURIComponent(searchQuery)}` : `http://localhost:3000/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (data.videos) {
        setResults(data.videos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleWatch = (videoId: string) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const openPinModal = (video: any) => {
    if (courses.length === 0) {
      Alert.alert("No Courses", "You need to create a course on the dashboard before you can pin a video.");
      return;
    }
    setVideoToPin(video);
    setPinModalVisible(true);
  };

  const handlePin = async (courseId: string) => {
    if (!videoToPin || !session?.user?.id) return;
    
    setPinning(true);
    try {
      const newId = Crypto.randomUUID();
      await powersync.execute(
        `INSERT INTO pinned_videos (id, user_id, course_id, video_id, title, channel, thumbnail_url, watched, pinned_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
        [newId, session.user.id, courseId, videoToPin.videoId, videoToPin.title, videoToPin.channel, videoToPin.thumbnail]
      );
      
      Alert.alert('Success', 'Video pinned to your library!');
      setPinModalVisible(false);
      setVideoToPin(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setPinning(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for study videos..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.resultsContainer}>
        
        {/* Pinned Library Section */}
        {pinnedVideos.length > 0 && !isSearching && results.length === 0 && (
          <View style={styles.pinnedSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pin" size={20} color={colors.tint} />
              <Text style={styles.sectionTitle}>Pinned Library</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinnedScroll}>
              {pinnedVideos.map((video) => (
                <TouchableOpacity key={video.id} style={styles.pinnedCard} onPress={() => handleWatch(video.video_id)}>
                  <Image source={{ uri: video.thumbnail_url }} style={styles.pinnedThumbnail} />
                  <View style={styles.pinnedInfo}>
                    <Text style={styles.pinnedTitle} numberOfLines={2}>{video.title}</Text>
                    <Text style={styles.pinnedChannel} numberOfLines={1}>{video.channel}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {results.length === 0 && !isSearching && pinnedVideos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="logo-youtube" size={64} color={colors.textMuted} style={{opacity: 0.5}} />
            <Text style={styles.emptyText}>Search for educational topics to watch videos here.</Text>
          </View>
        )}
        
        {results.length > 0 && (
          <Text style={[styles.sectionTitle, {marginBottom: 12}]}>Search Results</Text>
        )}

        {results.map((video) => (
          <TouchableOpacity key={video.videoId} style={styles.videoCard} onPress={() => handleWatch(video.videoId)}>
            <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
              <Text style={styles.channelTitle} numberOfLines={1}>{video.channel}</Text>
            </View>
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={(e) => {
                  e.stopPropagation(); // prevent opening video
                  openPinModal(video);
                }}
              >
                <Ionicons name="pin-outline" size={20} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Pin</Text>
              </TouchableOpacity>
              
              <View style={styles.playIconContainer}>
                <Ionicons name="play-circle" size={36} color={colors.tint} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pin Video Modal */}
      <Modal visible={pinModalVisible} animationType="slide" transparent={true} onRequestClose={() => setPinModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pin to Course</Text>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Select a course to pin <Text style={{fontWeight: 'bold'}}>{videoToPin?.title}</Text> to:
            </Text>

            {pinning ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={{color: colors.textMuted, marginTop: 12}}>Pinning video...</Text>
              </View>
            ) : (
              <ScrollView style={styles.courseList}>
                {courses.map(course => (
                  <TouchableOpacity 
                    key={course.id} 
                    style={[styles.courseOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handlePin(course.id)}
                  >
                    <Ionicons name="folder-outline" size={20} color={colors.tint} />
                    <View style={styles.courseOptionText}>
                      <Text style={[styles.courseOptionCode, { color: colors.text }]}>{course.course_code}</Text>
                      {course.title && <Text style={[styles.courseOptionName, { color: colors.textMuted }]}>{course.title}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: colors.tint,
    borderRadius: 8,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  pinnedSection: {
    marginBottom: 24,
  },
  pinnedScroll: {
    gap: 12,
  },
  pinnedCard: {
    width: 200,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinnedThumbnail: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
  },
  pinnedInfo: {
    padding: 8,
  },
  pinnedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  pinnedChannel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  videoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  channelTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginTop: -8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#333' : '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playIconContainer: {
    // right side
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
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
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  courseList: {
    maxHeight: 400,
  },
  courseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  courseOptionText: {
    flex: 1,
  },
  courseOptionCode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  courseOptionName: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
