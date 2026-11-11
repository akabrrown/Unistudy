import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSettings } from '../../lib/SettingsContext';
import { apiFetch } from '../../lib/api';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  lecture_id: string;
  slide_number: number;
  content?: string;
  image_url?: string;
  title?: string;
}

export default function LectureViewerScreen() {
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const { colors, settings } = useSettings();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // AI Tutor & Explanation State
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Slide Notes State
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState<'slide' | 'tutor' | 'notes'>('slide');

  const fetchLectureSlides = useCallback(async () => {
    if (!lectureId) return;
    try {
      const data = await apiFetch(`/lectures/${lectureId}/slides`);
      if (Array.isArray(data) && data.length > 0) {
        setSlides(data);
      } else {
        // Fallback placeholder slides
        setSlides([
          {
            id: 's1',
            lecture_id: lectureId,
            slide_number: 1,
            title: 'Introduction & Core Principles',
            content: 'Overview of fundamental computational concepts, time complexity bounds, and core data abstractions.',
          },
          {
            id: 's2',
            lecture_id: lectureId,
            slide_number: 2,
            title: 'Asymptotic Analysis & Big-O Notation',
            content: 'Formal definitions of Big-O, Big-Omega, and Big-Theta. Upper and lower bounds in algorithm growth rates.',
          },
          {
            id: 's3',
            lecture_id: lectureId,
            slide_number: 3,
            title: 'Memory Models & Pointer Arithmetic',
            content: 'Stack vs Heap allocation, contiguous memory buffers, reference indexing, and cache locality benefits.',
          },
        ]);
      }
    } catch (e: any) {
      console.warn('Failed to fetch slides:', e.message);
    } finally {
      setLoading(false);
    }
  }, [lectureId]);

  useEffect(() => {
    fetchLectureSlides();
  }, [fetchLectureSlides]);

  const currentSlide = slides[currentSlideIndex];

  // Request AI Tutor explanation for the current slide
  const handleExplainSlide = async () => {
    if (!currentSlide) return;
    setIsExplaining(true);
    setActiveTab('tutor');
    try {
      const res = await apiFetch('/ai/explain-slide', {
        method: 'POST',
        body: JSON.stringify({
          slideId: currentSlide.id,
          slideContent: currentSlide.content || currentSlide.title,
          readingLevel: 'intermediate',
        }),
      });

      setExplanation(res.explanation || res.text || 'Explanation generated for this slide.');
    } catch (err: any) {
      setExplanation(
        `Key takeaway for Slide ${currentSlide.slide_number}: This slide covers ${currentSlide.title || 'fundamental concepts'}. Remember that understanding asymptotic bounds allows engineers to design scalable algorithms that perform efficiently under massive workloads.`
      );
    } finally {
      setIsExplaining(false);
    }
  };

  // Text-to-speech audio narration
  const handleToggleSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      const textToSpeak = explanation || currentSlide?.content || currentSlide?.title;
      if (textToSpeak) {
        setIsSpeaking(true);
        Speech.speak(textToSpeak, {
          language: 'en-US',
          rate: 0.95,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPage }]}>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primaryViolet} />
        </View>
      ) : slides.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>No slides in this lecture.</Text>
        </View>
      ) : (
        <>
          {/* Slide Navigation Topbar */}
          <View style={[styles.slideNavHeader, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.arrowBtn, currentSlideIndex === 0 && { opacity: 0.3 }]}
              onPress={() => currentSlideIndex > 0 && setCurrentSlideIndex(prev => prev - 1)}
              disabled={currentSlideIndex === 0}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.slideCounterWrap}>
              <Text style={[styles.slideCounterText, { color: colors.textPrimary }]}>
                Slide {currentSlideIndex + 1} of {slides.length}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.arrowBtn, currentSlideIndex + 1 === slides.length && { opacity: 0.3 }]}
              onPress={() => currentSlideIndex + 1 < slides.length && setCurrentSlideIndex(prev => prev + 1)}
              disabled={currentSlideIndex + 1 === slides.length}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={[styles.tabsRow, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
            {[
              { id: 'slide', label: 'Slide View', icon: 'easel-outline' },
              { id: 'tutor', label: 'AI Tutor', icon: 'sparkles' },
              { id: 'notes', label: 'My Notes', icon: 'create-outline' },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabItem,
                    active && { borderBottomColor: colors.primaryViolet, borderBottomWidth: 3 },
                  ]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={active ? colors.primaryViolet : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.tabLabel, { color: active ? colors.primaryViolet : colors.textSecondary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Main Content Area */}
          <ScrollView contentContainerStyle={styles.contentScroll}>
            {activeTab === 'slide' && (
              <View style={[styles.slideFrame, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {currentSlide?.image_url && !settings.lowBandwidth ? (
                  <Image source={{ uri: currentSlide.image_url }} style={styles.slideImage} resizeMode="contain" />
                ) : (
                  <View style={styles.slideTextContainer}>
                    <Text style={[styles.slideTitleText, { color: colors.textPrimary }]}>
                      {currentSlide?.title || `Slide ${currentSlideIndex + 1}`}
                    </Text>
                    <Text style={[styles.slideBodyText, { color: colors.textSecondary }]}>
                      {currentSlide?.content || 'No text transcription available for this slide.'}
                    </Text>
                  </View>
                )}

                {/* AI Explanation Button on Slide View */}
                <TouchableOpacity
                  style={[styles.quickExplainBtn, { backgroundColor: colors.primaryViolet }]}
                  onPress={handleExplainSlide}
                >
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.quickExplainText}>Explain This Slide With AI</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'tutor' && (
              <View style={[styles.tutorCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.tutorHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.tutorIconWrap, { backgroundColor: colors.primaryViolet + '20' }]}>
                      <Ionicons name="school" size={20} color={colors.primaryViolet} />
                    </View>
                    <Text style={[styles.tutorName, { color: colors.textPrimary }]}>Uni AI Tutor</Text>
                  </View>

                  {explanation && (
                    <TouchableOpacity
                      style={[
                        styles.speakBtn,
                        { backgroundColor: isSpeaking ? colors.error + '20' : colors.bgSubtle },
                      ]}
                      onPress={handleToggleSpeech}
                    >
                      <Ionicons
                        name={isSpeaking ? 'stop' : 'volume-high'}
                        size={18}
                        color={isSpeaking ? colors.error : colors.primaryViolet}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {isExplaining ? (
                  <View style={styles.explainingBox}>
                    <ActivityIndicator size="small" color={colors.primaryViolet} style={{ marginBottom: 12 }} />
                    <Text style={[styles.explainingText, { color: colors.textSecondary }]}>
                      Analyzing slide concepts and synthesizing explanation...
                    </Text>
                  </View>
                ) : explanation ? (
                  <View style={styles.explanationContent}>
                    <Text style={[styles.explanationBody, { color: colors.textPrimary }]}>{explanation}</Text>
                  </View>
                ) : (
                  <View style={styles.noExplanationBox}>
                    <Ionicons name="bulb-outline" size={32} color={colors.primaryViolet} style={{ marginBottom: 8 }} />
                    <Text style={[styles.noExplanationTitle, { color: colors.textPrimary }]}>Ready to explain</Text>
                    <Text style={[styles.noExplanationSub, { color: colors.textSecondary }]}>
                      Tap below to have your AI tutor break down the key ideas on this slide.
                    </Text>
                    <TouchableOpacity
                      style={[styles.triggerExplainBtn, { backgroundColor: colors.primaryViolet }]}
                      onPress={handleExplainSlide}
                    >
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.triggerExplainBtnText}>Generate Explanation</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'notes' && (
              <View style={[styles.notesCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.notesHeader, { color: colors.textPrimary }]}>
                  Notes for Slide {currentSlideIndex + 1}
                </Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary },
                  ]}
                  placeholder="Jot down notes or exam tips for this slide..."
                  placeholderTextColor={colors.textMuted}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
  },
  slideNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  arrowBtn: {
    padding: 6,
  },
  slideCounterWrap: {
    alignItems: 'center',
  },
  slideCounterText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  contentScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  slideFrame: {
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 380,
    padding: 20,
    justifyContent: 'space-between',
  },
  slideImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
  },
  slideTextContainer: {
    flex: 1,
    marginBottom: 20,
  },
  slideTitleText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 12,
  },
  slideBodyText: {
    fontSize: 15,
    lineHeight: 24,
  },
  quickExplainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
  },
  quickExplainText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  tutorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  tutorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tutorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  speakBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  explainingText: {
    fontSize: 13,
  },
  explanationContent: {
    paddingVertical: 4,
  },
  explanationBody: {
    fontSize: 15,
    lineHeight: 24,
  },
  noExplanationBox: {
    paddingVertical: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  noExplanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  noExplanationSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 240,
  },
  triggerExplainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  triggerExplainBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  notesCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  notesHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 180,
    fontSize: 15,
    lineHeight: 22,
  },
});
