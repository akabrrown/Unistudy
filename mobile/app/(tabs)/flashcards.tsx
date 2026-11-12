import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../lib/SettingsContext';
import { apiFetch } from '../../lib/api';
import { OfflineManager, PendingRating } from '../../lib/offline';
import { resolveCourseColor } from '../../lib/constants/courses';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  lecture_id?: string;
  course_id?: string;
  course_code?: string;
  course_colour?: string;
  ease_factor?: number;
  interval_days?: number;
  repetitions?: number;
  next_review?: string;
}

export default function FlashcardsScreen() {
  const { colors } = useSettings();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCourse, setFilterCourse] = useState<string>('all');

  // Study Session State
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studySessionCompleted, setStudySessionCompleted] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);

  // Flip Animation
  const [flipAnim] = useState(new Animated.Value(0));

  const loadFlashcards = useCallback(async () => {
    try {
      // 1. Sync pending offline ratings first
      await OfflineManager.syncPendingRatings();

      // 2. Fetch due flashcards from backend
      const res = await apiFetch('/flashcards?due=true');
      const loadedCards: Flashcard[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setCards(loadedCards);
      await OfflineManager.cacheFlashcards(loadedCards);
    } catch (e: any) {
      console.warn('Network fetch failed, reading from offline cache:', e.message);
      const cached = await OfflineManager.getCachedFlashcards();
      if (cached.length > 0) {
        setCards(cached);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFlashcards();
  };

  const handleFlip = () => {
    if (isFlipped) {
      Animated.spring(flipAnim, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsFlipped(false);
    } else {
      Animated.spring(flipAnim, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsFlipped(true);
    }
  };

  const currentCard = cards[currentIndex];

  const handleRateCard = async (rating: number) => {
    if (!currentCard) return;

    const ease = currentCard.ease_factor || 2.5;
    const interval = currentCard.interval_days || 1;
    const reps = currentCard.repetitions || 0;

    const pendingItem: PendingRating = {
      cardId: currentCard.id,
      rating,
      currentData: {
        ease_factor: ease,
        interval_days: interval,
        repetitions: reps,
      },
      timestamp: Date.now(),
    };

    // Optimistically update
    setSessionReviewedCount(prev => prev + 1);

    try {
      const isOnline = await OfflineManager.isOnline();
      if (isOnline) {
        await apiFetch('/flashcards/review', {
          method: 'POST',
          body: JSON.stringify({
            cardId: currentCard.id,
            rating,
            currentData: pendingItem.currentData,
          }),
        });
      } else {
        await OfflineManager.recordRatingOffline(pendingItem);
      }
    } catch {
      await OfflineManager.recordRatingOffline(pendingItem);
    }

    // Move to next card
    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      flipAnim.setValue(0);
      setCurrentIndex(prev => prev + 1);
    } else {
      setStudySessionCompleted(true);
    }
  };

  const startReview = () => {
    if (cards.length === 0) return;
    setCurrentIndex(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
    setSessionReviewedCount(0);
    setStudySessionCompleted(false);
    setIsStudying(true);
  };

  const exitReview = () => {
    setIsStudying(false);
    loadFlashcards();
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Extract unique courses for filter
  const courseOptions = Array.from(new Set(cards.map(c => c.course_code).filter(Boolean)));

  const filteredCards = filterCourse === 'all'
    ? cards
    : cards.filter(c => c.course_code === filterCourse);

  // Study View
  if (isStudying) {
    if (studySessionCompleted) {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]}>
          <View style={styles.completedContainer}>
            <View style={[styles.celebrationBadge, { backgroundColor: '#10B98125' }]}>
              <Ionicons name="trophy" size={56} color="#10B981" />
            </View>
            <Text style={[styles.completedTitle, { color: colors.textPrimary }]}>Session Complete!</Text>
            <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
              You reviewed {sessionReviewedCount} cards today. Your memory retention is stronger!
            </Text>
            <View style={[styles.rewardCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name="star" size={24} color={colors.primaryViolet} />
              <Text style={[styles.rewardText, { color: colors.textPrimary }]}>
                +{(sessionReviewedCount * 5)} Knowledge Points (XP)
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.finishBtn, { backgroundColor: colors.primaryViolet }]}
              onPress={exitReview}
            >
              <Text style={styles.finishBtnText}>Return to Decks</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]}>
        {/* Study Top Bar */}
        <View style={styles.studyHeader}>
          <TouchableOpacity onPress={exitReview} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.bgSubtle }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primaryViolet,
                    width: `${((currentIndex + 1) / cards.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {currentIndex + 1} of {cards.length}
            </Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        {/* Flip Flashcard */}
        <View style={styles.cardArea}>
          <TouchableOpacity activeOpacity={1} onPress={handleFlip} style={styles.cardTouch}>
            {/* Front Card */}
            <Animated.View
              style={[
                styles.flipCard,
                styles.flipCardFront,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: isFlipped ? 'transparent' : colors.border,
                  transform: [{ rotateY: frontInterpolate }],
                  backfaceVisibility: 'hidden',
                },
              ]}
            >
              {currentCard?.course_code && (
                <View style={[styles.cardCourseBadge, { backgroundColor: colors.bgSubtle }]}>
                  <Text style={[styles.cardCourseText, { color: colors.primaryViolet }]}>
                    {currentCard.course_code}
                  </Text>
                </View>
              )}
              <Text style={[styles.cardPromptLabel, { color: colors.textMuted }]}>QUESTION</Text>
              <Text style={[styles.cardQuestionText, { color: colors.textPrimary }]}>
                {currentCard?.question}
              </Text>
              <View style={styles.tapToFlipHint}>
                <Ionicons name="sync" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.tapToFlipText, { color: colors.textMuted }]}>Tap card to flip answer</Text>
              </View>
            </Animated.View>

            {/* Back Card */}
            <Animated.View
              style={[
                styles.flipCard,
                styles.flipCardBack,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: isFlipped ? colors.primaryViolet : colors.border,
                  transform: [{ rotateY: backInterpolate }],
                  backfaceVisibility: 'hidden',
                },
              ]}
            >
              <Text style={[styles.cardPromptLabel, { color: colors.primaryViolet }]}>ANSWER</Text>
              <ScrollView style={styles.answerScroll} contentContainerStyle={{ paddingBottom: 10 }}>
                <Text style={[styles.cardAnswerText, { color: colors.textPrimary }]}>
                  {currentCard?.answer}
                </Text>
              </ScrollView>
              <View style={styles.tapToFlipHint}>
                <Ionicons name="sync" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.tapToFlipText, { color: colors.textMuted }]}>Tap to flip back</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* SM-2 Rating Buttons */}
        <View style={styles.ratingsContainer}>
          <Text style={[styles.rateTitle, { color: colors.textSecondary }]}>
            {isFlipped ? 'How well did you know this?' : 'Flip card to rate recall'}
          </Text>
          <View style={styles.ratingsRow}>
            {[
              { label: 'Again', rating: 1, color: '#EF4444', desc: '< 10m' },
              { label: 'Hard', rating: 3, color: '#F59E0B', desc: '1 day' },
              { label: 'Good', rating: 4, color: '#3B82F6', desc: '3 days' },
              { label: 'Easy', rating: 5, color: '#10B981', desc: '7 days' },
            ].map(r => (
              <TouchableOpacity
                key={r.label}
                style={[
                  styles.rateBtn,
                  { backgroundColor: colors.bgCard, borderColor: r.color },
                  !isFlipped && styles.rateBtnDisabled,
                ]}
                onPress={() => isFlipped && handleRateCard(r.rating)}
                disabled={!isFlipped}
                activeOpacity={0.7}
              >
                <Text style={[styles.rateBtnLabel, { color: r.color }]}>{r.label}</Text>
                <Text style={[styles.rateBtnDesc, { color: colors.textMuted }]}>{r.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Decks & Overview Screen
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryViolet} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Spaced Repetition</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Scientific SM-2 algorithm to guarantee long-term exam recall.
            </Text>
          </View>
        </View>

        {/* Due Cards Summary Banner */}
        <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={[styles.dueNumber, { color: colors.primaryViolet }]}>{cards.length}</Text>
              <Text style={[styles.dueLabel, { color: colors.textPrimary }]}>Flashcards Ready For Review</Text>
            </View>
            <View style={[styles.dueIconWrap, { backgroundColor: colors.primaryViolet + '20' }]}>
              <Ionicons name="albums" size={32} color={colors.primaryViolet} />
            </View>
          </View>

          {cards.length > 0 ? (
            <TouchableOpacity
              style={[styles.startSessionBtn, { backgroundColor: colors.primaryViolet }]}
              onPress={startReview}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.startSessionText}>Start Daily Review ({cards.length})</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.allDoneNotice}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={{ color: '#10B981', fontWeight: '700' }}>All caught up! Check back tomorrow.</Text>
            </View>
          )}
        </View>

        {/* Course Filter Pills */}
        {courseOptions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: filterCourse === 'all' ? colors.primaryViolet : colors.bgCard,
                  borderColor: filterCourse === 'all' ? colors.primaryViolet : colors.border,
                },
              ]}
              onPress={() => setFilterCourse('all')}
            >
              <Text style={{ color: filterCourse === 'all' ? '#FFFFFF' : colors.textPrimary, fontWeight: '600' }}>
                All Courses ({cards.length})
              </Text>
            </TouchableOpacity>

            {courseOptions.map(code => {
              const count = cards.filter(c => c.course_code === code).length;
              const active = filterCourse === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? colors.primaryViolet : colors.bgCard,
                      borderColor: active ? colors.primaryViolet : colors.border,
                    },
                  ]}
                  onPress={() => setFilterCourse(code!)}
                >
                  <Text style={{ color: active ? '#FFFFFF' : colors.textPrimary, fontWeight: '600' }}>
                    {code} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Cards Preview List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Queue Preview</Text>
          <Text style={[styles.countText, { color: colors.textMuted }]}>{filteredCards.length} cards</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primaryViolet} style={{ marginVertical: 30 }} />
        ) : filteredCards.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="albums-outline" size={36} color={colors.primaryViolet} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No cards in review queue</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Flashcards are automatically generated from your lecture slides. Upload your syllabus or slide decks to create your deck!
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredCards.slice(0, 10).map((card, idx) => (
              <View
                key={card.id || idx}
                style={[styles.cardItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              >
                <View style={styles.cardItemHeader}>
                  <Text style={[styles.cardItemCode, { color: colors.primaryViolet }]}>
                    {card.course_code || 'MODULE'}
                  </Text>
                  <Text style={[styles.cardItemIndex, { color: colors.textMuted }]}>#{idx + 1}</Text>
                </View>
                <Text style={[styles.cardItemQ, { color: colors.textPrimary }]} numberOfLines={2}>
                  {card.question}
                </Text>
                <Text style={[styles.cardItemA, { color: colors.textSecondary }]} numberOfLines={2}>
                  {card.answer}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dueNumber: {
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  dueLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  dueIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
  },
  startSessionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  allDoneNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  filterPills: {
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countText: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  cardList: {
    gap: 12,
  },
  cardItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardItemCode: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardItemIndex: {
    fontSize: 12,
  },
  cardItemQ: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
  },
  cardItemA: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Study View Styles
  studyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  cardTouch: {
    width: width - 40,
    height: 380,
  },
  flipCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  flipCardFront: {},
  flipCardBack: {},
  cardCourseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardCourseText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardPromptLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardQuestionText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  answerScroll: {
    flex: 1,
    marginVertical: 10,
  },
  cardAnswerText: {
    fontSize: 16,
    lineHeight: 24,
  },
  tapToFlipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapToFlipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratingsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  rateTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnDisabled: {
    opacity: 0.35,
  },
  rateBtnLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  rateBtnDesc: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  celebrationBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 32,
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '700',
  },
  finishBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

