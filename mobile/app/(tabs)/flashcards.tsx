import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors, useThemeColors } from '../../constants/Colors';
import Constants from 'expo-constants';

// Simplified SM2 constants for mobile offline-first
function calculateNextReview(current: any, rating: 'hard'|'good'|'easy') {
  let { ease_factor, interval_days, repetitions } = current;
  
  if (rating === 'hard') {
    repetitions = 0;
    interval_days = 1;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else if (rating === 'good') {
    repetitions += 1;
    if (repetitions === 1) interval_days = 1;
    else if (repetitions === 2) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
  } else if (rating === 'easy') {
    repetitions += 1;
    if (repetitions === 1) interval_days = 4;
    else if (repetitions === 2) interval_days = 10;
    else {
      ease_factor += 0.15;
      interval_days = Math.round(interval_days * ease_factor * 1.3);
    }
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval_days);
  
  return { ease_factor, interval_days, repetitions, next_review: nextDate.toISOString() };
}

export default function FlashcardsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const styles = getStyles(colors, theme === 'dark');

  useEffect(() => {
    if (authLoading || !user) return;
    
    async function fetchCards() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const debuggerHost = Constants.expoConfig?.hostUri;
        const localIp = debuggerHost?.split(':')[0];
        
        let baseUrl = 'https://unistudy-ai.vercel.app';
        if (localIp) {
          if (localIp.includes('exp.direct') || localIp.includes('ngrok')) {
            // Tunneling Metro, but backend is separate. Fallback to 10.0.2.2 for emulator
            baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
          } else {
            baseUrl = `http://${localIp}:8000`;
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const res = await fetch(`${baseUrl}/api/cards`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
          const json = await res.json();
          setCards(json.data || []);
        } else {
          console.log('Flashcards API returned non-JSON or error status', res.status);
        }
      } catch (err) {
        console.log('Error fetching cards (timeout or offline):', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [user, authLoading]);

  const handleReview = async (rating: 'hard'|'good'|'easy') => {
    if (submitting) return;
    setSubmitting(true);
    
    const card = cards[currentIndex];
    const isQuiz = card.type === 'quiz';
    
    if (isQuiz) {
      // For quizzes, just record attempt
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      
      let baseUrl = 'https://unistudy-ai.vercel.app';
      if (localIp) {
        if (localIp.includes('exp.direct') || localIp.includes('ngrok')) {
          baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
        } else {
          baseUrl = `http://${localIp}:8000`;
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      
      await fetch(`${baseUrl}/api/quizzes/attempt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData?.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionId: card.id, isCorrect: rating !== 'hard' })
      });
    } else {
      const nextData = calculateNextReview({
        ease_factor: card.ease_factor || 2.5,
        interval_days: card.interval_days || 1,
        repetitions: card.repetitions || 0
      }, rating);

      const { error } = await supabase
        .from('flashcards')
        .update({
          ease_factor: nextData.ease_factor,
          interval_days: nextData.interval_days,
          repetitions: nextData.repetitions,
          next_review: nextData.next_review,
          last_rating: rating === 'hard' ? 1 : rating === 'good' ? 4 : 5
        })
        .eq('id', card.id);

      if (error) {
        Alert.alert('Error', 'Failed to save review');
        setSubmitting(false);
        return;
      }
    }

    // Award XP
    const { data: profile } = await supabase.from('profiles').select('total_xp').eq('id', user?.id).single();
    if (profile) {
      await supabase.from('profiles').update({ total_xp: profile.total_xp + 5 }).eq('id', user?.id);
    }
    
    setFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Refresh cards
      setCards([]);
    }
    setSubmitting(false);
  };


  if (loading || authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        <Text style={styles.doneTitle}>You're all caught up!</Text>
        <Text style={styles.doneSub}>Awesome job. Check back tomorrow for more reviews.</Text>
        
        <TouchableOpacity 
          style={{ marginTop: 32, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => {
            Alert.alert(
              'Regenerate Flashcards',
              'This will clear your current flashcards. Proceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Regenerate', 
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    await supabase.from('flashcards').delete().eq('user_id', user?.id);
                    Alert.alert('Cleared!', 'Please visit the web dashboard to generate new flashcards from your slide decks.');
                    setLoading(false);
                  }
                }
              ]
            );
          }}
        >
          <Ionicons name="refresh" size={20} color={colors.tint} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.tint, fontWeight: 'bold', fontSize: 16 }}>Regenerate Flashcards</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="cloud-done" size={16} color={colors.success} />
          <Text style={styles.badgeText}>Synced</Text>
        </View>
        <Text style={styles.count}>{currentIndex + 1}/{cards.length} Due</Text>
      </View>

      <TouchableOpacity 
        style={styles.flashcard}
        activeOpacity={0.9}
        onPress={() => !submitting && setFlipped(!flipped)}
        disabled={submitting}
      >
        <View style={styles.cardInner}>
          {!flipped ? (
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{currentCard.type === 'quiz' ? 'QUIZ QUESTION' : 'QUESTION'}</Text>
              <Text style={styles.cardText}>{currentCard.front || currentCard.question}</Text>
            </View>
          ) : (
            <View style={[styles.cardContent, styles.cardContentBack]}>
              <Text style={[styles.cardLabel, { color: colors.tint }]}>ANSWER</Text>
              <Text style={styles.cardText}>{currentCard.back || currentCard.correct_answer}</Text>
              {currentCard.type === 'quiz' && currentCard.explanation && (
                <Text style={styles.explanation}>{currentCard.explanation}</Text>
              )}
              {currentCard.tags && currentCard.tags.length > 0 && (
                <Text style={styles.explanation}>Tags: {currentCard.tags.join(', ')}</Text>
              )}
            </View>
          )}
          <Text style={styles.tapToFlip}>{submitting ? 'Saving...' : 'Tap to flip'}</Text>
        </View>
      </TouchableOpacity>

      {flipped && !submitting && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme === 'dark' ? '#3B1D1D' : '#FFEBEE' }]} onPress={() => handleReview('hard')}>
            <Text style={[styles.actionText, { color: colors.destructive }]}>Hard</Text>
            <Text style={styles.actionSub}>&lt; 1m</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme === 'dark' ? '#3E2723' : '#FFF3E0' }]} onPress={() => handleReview('good')}>
            <Text style={[styles.actionText, { color: colors.warning }]}>Good</Text>
            <Text style={styles.actionSub}>Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme === 'dark' ? '#1B5E20' : '#E8F5E9' }]} onPress={() => handleReview('easy')}>
            <Text style={[styles.actionText, { color: colors.success }]}>Easy</Text>
            <Text style={styles.actionSub}>Longer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  doneSub: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  count: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  flashcard: {
    height: 400,
    backgroundColor: colors.card,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 40,
  },
  cardInner: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContentBack: {
    backgroundColor: colors.background,
    margin: -32,
    padding: 32,
    borderRadius: 24,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 24,
  },
  cardText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  explanation: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  tapToFlip: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  actionBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '30%',
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 12,
    color: colors.textMuted,
  }
});
