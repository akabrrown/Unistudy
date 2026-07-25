import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, useColorScheme, Dimensions, ScrollView, useWindowDimensions, TouchableWithoutFeedback, Modal, TextInput, KeyboardAvoidingView, Platform, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors, useThemeColors } from '../../constants/Colors';
import NetInfo from '@react-native-community/netinfo';
import { getDb } from '../../lib/db';
import * as ScreenOrientation from 'expo-screen-orientation';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import Svg, { Path } from 'react-native-svg';

export default function LectureViewerScreen() {
  const router = useRouter();
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
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

  // New features state
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Modals state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [isSongOpen, setIsSongOpen] = useState(false);
  const [songContent, setSongContent] = useState('');
  const [isSongLoading, setIsSongLoading] = useState(false);

  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedExplanation, setTranslatedExplanation] = useState('');

  // Drawing state
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');

  // Force landscape on mount, restore portrait on unmount
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      Speech.stop();
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
        if (active) {
          setExplanation(currentSlide.explanation);
          setIsTranslated(false);
          setTranslatedExplanation('');
        }
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
            const cleanExpl = json.explanation.replace(/<[^>]+>/g, '').trim();
            setExplanation(cleanExpl);
            setIsTranslated(false);
            setTranslatedExplanation('');

            // Save back to state
            currentSlide.explanation = cleanExpl;

            // Save to local DB if downloaded
            getDb().then(db => {
              db.runAsync('UPDATE downloaded_slides SET explanation = ? WHERE id = ?', [cleanExpl, currentSlide.id])
                .catch(e => console.log('Not downloaded locally', e));
            });

            // Save to Supabase if online
            NetInfo.fetch().then(state => {
              if (state.isConnected) {
                supabase.from('slides').update({ explanation: cleanExpl }).eq('id', currentSlide.id)
                  .then(({ error }) => {
                    if (error) console.error('Failed to save explanation to Supabase:', error);
                  });
              }
            });
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
    // Reset drawings when slide changes
    setPaths([]);
    setCurrentPath('');
    setIsDrawMode(false);
    // Stop speaking when slide changes
    Speech.stop();
    setIsSpeaking(false);

    return () => { active = false; };
  }, [slideIndex, currentSlide, lecture]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => {
        // don't hide controls if we are drawing or a modal is open
        if (!isDrawMode && !isNotesOpen && !isChatOpen && !isSongOpen) {
          setShowControls(false);
        }
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, slideIndex, isDrawMode, isNotesOpen, isChatOpen, isSongOpen]);

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

  const handleSpeak = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      const textToRead = explanation || currentSlide?.raw_text;
      if (textToRead) {
        Speech.speak(textToRead, {
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
        setIsSpeaking(true);
      }
    }
  };

  const handleTranslate = async () => {
    if (!explanation) return;
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const apiUrl = localIp ? `http://${localIp}:3000/api/translate` : 'https://unistudy-ai.vercel.app/api/translate';
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: explanation, targetLanguage: 'fr' })
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslatedExplanation(data.translatedText);
        setIsTranslated(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const apiUrl = localIp ? `http://${localIp}:3000/api/ai/ask` : 'https://unistudy-ai.vercel.app/api/ai/ask';
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'chat_message',
          payload: { 
            stream: false, 
            systemPrompt: `Slide Text: ${currentSlide?.raw_text}. Answer the student's question concisely.`,
            messages: [...chatMessages, userMsg]
          }
        })
      });
      const data = await res.json();
      const content = data.result?.choices?.[0]?.message?.content || "No response";
      setChatMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateSong = async () => {
    setIsSongOpen(true);
    setIsSongLoading(true);
    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const apiUrl = localIp ? `http://${localIp}:3000/api/ai/ask` : 'https://unistudy-ai.vercel.app/api/ai/ask';
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'revision_song',
          payload: { prompt: currentSlide?.raw_text, stream: false }
        })
      });
      const data = await res.json();
      const content = data.result?.choices?.[0]?.message?.content || "Failed to generate song.";
      setSongContent(content);
    } catch (e) {
      setSongContent("Error generating song.");
    } finally {
      setIsSongLoading(false);
    }
  };

  // Drawing PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        setPaths((prev) => [...prev, currentPath]);
        setCurrentPath('');
      },
    })
  ).current;

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
        
        {/* Horizontal Toolbar on Top Right */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleSpeak}>
            <Ionicons name={isSpeaking ? "volume-high" : "volume-medium"} size={20} color={isSpeaking ? colors.tint : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setIsNotesOpen(true)}>
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setIsChatOpen(true)}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setIsDrawMode(!isDrawMode)}>
            <Ionicons name="brush-outline" size={20} color={isDrawMode ? colors.tint : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleGenerateSong}>
            <Ionicons name="musical-notes-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleTranslate}>
            <Ionicons name="language-outline" size={20} color={isTranslated ? colors.tint : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setShowExplanation(!showExplanation)}
          >
            <Ionicons name={showExplanation ? 'eye-off-outline' : 'bulb-outline'} size={20} color={showExplanation ? colors.tint : colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content area */}
      <View style={styles.mainContent}>
        {/* Slide image area */}
        <TouchableWithoutFeedback onPress={() => setShowControls(true)}>
          <View style={[styles.slideArea, showExplanation && { flex: 3 }]}>
          {currentSlide?.image_local_uri || currentSlide?.image_url ? (
            <View style={{width: '100%', height: '100%'}}>
              <Image
                source={{ uri: currentSlide.image_local_uri || currentSlide.image_url }}
                style={styles.slideImage}
                resizeMode="contain"
              />
              {isDrawMode && (
                <View style={styles.drawOverlay} {...panResponder.panHandlers}>
                  <Svg style={StyleSheet.absoluteFill}>
                    {paths.map((p, i) => (
                      <Path key={i} d={p} stroke="red" strokeWidth={3} fill="none" />
                    ))}
                    {currentPath ? (
                      <Path d={currentPath} stroke="red" strokeWidth={3} fill="none" />
                    ) : null}
                  </Svg>
                  <TouchableOpacity style={styles.clearDrawBtn} onPress={() => {setPaths([]); setCurrentPath('');}}>
                    <Text style={styles.clearDrawText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
          {showControls && !isDrawMode && (
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
            <Text style={styles.explanationTitle}>Explanation {isTranslated && '(Translated)'}</Text>
            {loadingAI ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>Generating with AI...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.explanationText}>
                  {isTranslated ? translatedExplanation : (explanation || currentSlide?.raw_text || 'No explanation available for this slide.')}
                </Text>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Bottom slide thumbnails */}
      {showControls && !isDrawMode && (
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
      )}

      {/* Slide Notes Modal */}
      <Modal visible={isNotesOpen} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Slide Notes</Text>
              <TouchableOpacity onPress={() => setIsNotesOpen(false)}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, {height: 150}]}
              multiline
              placeholder="Jot down notes for this slide..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
            <TouchableOpacity style={styles.modalBtn} onPress={() => setIsNotesOpen(false)}>
              <Text style={styles.modalBtnText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Chat Modal */}
      <Modal visible={isChatOpen} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Tutor Chat</Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity>
            </View>
            <ScrollView style={styles.chatScroll} contentContainerStyle={{paddingBottom: 16}}>
              {chatMessages.map((m, i) => (
                <View key={i} style={m.role === 'user' ? styles.chatMsgUser : styles.chatMsgAi}>
                  <Text style={m.role === 'user' ? styles.chatTextUser : styles.chatTextAi}>{m.content}</Text>
                </View>
              ))}
              {isChatLoading && <ActivityIndicator size="small" color={colors.tint} style={{marginTop: 8}}/>}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={[styles.textInput, {flex: 1, marginBottom: 0}]}
                placeholder="Ask about this slide..."
                placeholderTextColor={colors.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendChat}
              />
              <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChat} disabled={isChatLoading}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Revision Song Modal */}
      <Modal visible={isSongOpen} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Revision Song</Text>
              <TouchableOpacity onPress={() => setIsSongOpen(false)}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity>
            </View>
            <ScrollView style={{flex: 1, paddingVertical: 16}}>
              {isSongLoading ? (
                <ActivityIndicator size="large" color={colors.tint} style={{marginTop: 40}}/>
              ) : (
                <Text style={styles.songText}>{songContent}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    zIndex: 50,
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
  toolbar: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  drawOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  clearDrawBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearDrawText: {
    color: '#fff',
    fontWeight: 'bold',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    zIndex: 50,
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
  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenW * 0.5, // 50% of screen width since it's landscape
    minWidth: 320,
    maxHeight: screenH * 0.8,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  textInput: {
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtn: {
    backgroundColor: colors.tint,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chatScroll: {
    flex: 1,
    marginBottom: 16,
  },
  chatMsgUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.tint,
    padding: 10,
    borderRadius: 12,
    borderBottomRightRadius: 2,
    maxWidth: '80%',
    marginBottom: 8,
  },
  chatTextUser: {
    color: '#fff',
    fontSize: 14,
  },
  chatMsgAi: {
    alignSelf: 'flex-start',
    backgroundColor: isDark ? '#2a2a2a' : '#e0e0e0',
    padding: 10,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    maxWidth: '90%',
    marginBottom: 8,
  },
  chatTextAi: {
    color: colors.text,
    fontSize: 14,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'center',
  },
});
