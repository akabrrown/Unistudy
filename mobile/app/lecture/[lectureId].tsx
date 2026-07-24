import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, useColorScheme, Dimensions, ScrollView, useWindowDimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import NetInfo from '@react-native-community/netinfo';
import { getDb } from '../../lib/db';
import * as ScreenOrientation from 'expo-screen-orientation';
import Constants from 'expo-constants';

export default function LectureViewerScreen() {
  const router = useRouter();
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = getStyles(colors, isDark, screenWidth, screenHeight);

  const [lecture, setLecture] = useState<any>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [explanation, setExplanation] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Force landscape on mount, restore portrait on unmount
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    async function fetchLectureData() {
      const netInfo = await NetInfo.fetch();
      let isDownloaded = false;

      // Check local DB first
      const db = await getDb();
      const localLecture = await db.getFirstAsync('SELECT * FROM downloaded_lectures WHERE id = ?', [lectureId]);
      
      if (localLecture || !netInfo.isConnected) {
        isDownloaded = true;
        setLecture(localLecture);
        
        const localSlides = await db.getAllAsync('SELECT * FROM downloaded_slides WHERE lecture_id = ? ORDER BY slide_index ASC', [lectureId]);
        setSlides(localSlides as any[]);
        setLoading(false);
        return;
      }

      if (netInfo.isConnected) {
        const { data: lectureData } = await supabase
          .from('lectures')
          .select('*, courses(*)')
          .eq('id', lectureId)
          .single();
          
        setLecture(lectureData);

        const { data: slideData } = await supabase
          .from('slides')
          .select('*')
          .eq('lecture_id', lectureId)
          .order('slide_index', { ascending: true });

        setSlides(slideData || []);
      }
      setLoading(false);
    }

    if (lectureId) fetchLectureData();
  }, [lectureId]);

  const currentSlide = slides[slideIndex];
  const totalSlides = slides.length;

  useEffect(() => {
    let active = true;

    async function fetchExplanation() {
      if (!currentSlide || (!currentSlide.raw_text && !currentSlide.explanation && !currentSlide.image_url)) {
        if (active) setExplanation('');
        return;
      }
      if (currentSlide.explanation) {
        if (active) setExplanation(currentSlide.explanation);
        return;
      }

      if (active) setLoadingAI(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localIp = debuggerHost?.split(':')[0];
        const apiUrl = localIp ? `http://${localIp}:3000/api/ai/explain-slide` : 'https://unistudy-ai.vercel.app/api/ai/explain-slide';

        const courseCode = Array.isArray(lecture?.courses) ? lecture?.courses[0]?.course_code : (lecture?.courses as any)?.course_code;
        const courseTitle = Array.isArray(lecture?.courses) ? lecture?.courses[0]?.title : (lecture?.courses as any)?.title;
        const context = `${courseCode || ''}: ${courseTitle || ''}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            slideText: currentSlide.raw_text || '',
            level: 'Med',
            courseContext: context,
            imageUrl: currentSlide.image_url
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const json = await res.json();
        if (active) {
          if (res.ok && json.explanation) {
            setExplanation(json.explanation.replace(/<[^>]+>/g, '').trim());
          } else {
            setExplanation(`API Error: ${json.error || res.statusText || 'Unknown error'}`);
          }
        }
      } catch (err: any) {
        if (active) setExplanation(`Network Error: ${err.message}`);
      } finally {
        if (active) setLoadingAI(false);
      }
    }

    fetchExplanation();

    return () => { active = false; };
  }, [slideIndex, currentSlide, lecture]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, slideIndex]);

  const goNext = () => {
    if (slideIndex < totalSlides - 1) {
      setSlideIndex(slideIndex + 1);
      setShowExplanation(false);
    }
  };

  const goPrev = () => {
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
      setShowExplanation(false);
    }
  };

  const handleExit = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const courseCode = Array.isArray(lecture?.courses)
    ? lecture?.courses[0]?.course_code
    : (lecture?.courses as any)?.course_code;

  if (slides.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Ionicons name="document-text-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No slides found</Text>
        <Text style={styles.emptySubtext}>This lecture hasn't been processed yet, or has no content.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleExit} style={styles.topBarBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {courseCode ? `${courseCode} — ` : ''}{lecture?.title || 'Lecture'}
          </Text>
          <Text style={styles.topBarSlideCount}>
            Slide {slideIndex + 1} of {totalSlides}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={() => setShowExplanation(!showExplanation)}
        >
          <Ionicons name={showExplanation ? 'eye-off-outline' : 'bulb-outline'} size={22} color={showExplanation ? colors.tint : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.mainContent}>
        {/* Slide image area */}
        <TouchableWithoutFeedback onPress={() => setShowControls(true)}>
          <View style={[styles.slideArea, showExplanation && { flex: 3 }]}>
          {currentSlide?.image_local_uri || currentSlide?.image_url ? (
            <Image
              source={{ uri: currentSlide.image_local_uri || currentSlide.image_url }}
              style={styles.slideImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.slideTextFallback}>
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.slideRawText}>
                  {currentSlide?.raw_text || 'No content for this slide.'}
                </Text>
              </ScrollView>
            </View>
          )}

          {/* Navigation arrows overlaid on slide */}
          {showControls && (
            <>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={goPrev}
                disabled={slideIndex === 0}
              >
                <Ionicons name="chevron-back" size={28} color={slideIndex === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={goNext}
                disabled={slideIndex === totalSlides - 1}
              >
                <Ionicons name="chevron-forward" size={28} color={slideIndex === totalSlides - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
              </TouchableOpacity>
            </>
          )}
        </View>
        </TouchableWithoutFeedback>

        {/* Explanation panel (toggleable) */}
        {showExplanation && (
          <View style={styles.explanationPanel}>
            <Text style={styles.explanationTitle}>Explanation</Text>
            {loadingAI ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>Generating with AI...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.explanationText}>
                  {explanation || currentSlide?.raw_text || 'No explanation available for this slide.'}
                </Text>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Bottom slide thumbnails */}
      <View style={styles.bottomBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
          {slides.map((slide, i) => (
            <TouchableOpacity
              key={slide.id || i}
              style={[styles.thumbnail, i === slideIndex && styles.thumbnailActive]}
              onPress={() => { setSlideIndex(i); setShowExplanation(false); }}
            >
              {slide.image_url ? (
                <Image source={{ uri: slide.image_url }} style={styles.thumbnailImage} resizeMode="cover" />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Text style={styles.thumbnailNumber}>{i + 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean, screenW: number, screenH: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#000' : '#111',
  },
  exitBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ccc',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  topBarSlideCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  // Main content
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  slideArea: {
    flex: 5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideTextFallback: {
    flex: 1,
    width: '100%',
    backgroundColor: isDark ? '#1a1a1a' : '#222',
  },
  slideRawText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 24,
  },
  // Nav arrows
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  navArrowLeft: {
    left: 8,
  },
  navArrowRight: {
    right: 8,
  },
  // Explanation panel
  explanationPanel: {
    flex: 2,
    backgroundColor: isDark ? '#1a1a1a' : '#fafafa',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 14,
    color: isDark ? '#ccc' : '#333',
    lineHeight: 22,
  },
  // Bottom thumbnails
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
  },
  thumbnailRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  thumbnail: {
    width: 72,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.tint,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailNumber: {
    color: '#999',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
