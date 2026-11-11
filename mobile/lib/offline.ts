import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiFetch } from './api';

const FLASHCARDS_CACHE_KEY = 'unistudy_offline_flashcards';
const PENDING_RATINGS_KEY = 'unistudy_pending_ratings';
const COURSES_CACHE_KEY = 'unistudy_offline_courses';

export interface PendingRating {
  cardId: string;
  rating: number;
  currentData: {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
  };
  timestamp: number;
}

export const OfflineManager = {
  // Check active connectivity
  isOnline: async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  },

  // Cache flashcards for offline review
  cacheFlashcards: async (flashcards: any[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(FLASHCARDS_CACHE_KEY, JSON.stringify(flashcards));
    } catch (e) {
      console.warn('Failed to cache flashcards offline:', e);
    }
  },

  // Get cached flashcards
  getCachedFlashcards: async (): Promise<any[]> => {
    try {
      const data = await AsyncStorage.getItem(FLASHCARDS_CACHE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Record a review rating offline
  recordRatingOffline: async (rating: PendingRating): Promise<void> => {
    try {
      const existing = await OfflineManager.getPendingRatings();
      existing.push(rating);
      await AsyncStorage.setItem(PENDING_RATINGS_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to record rating offline:', e);
    }
  },

  // Get pending ratings queue
  getPendingRatings: async (): Promise<PendingRating[]> => {
    try {
      const data = await AsyncStorage.getItem(PENDING_RATINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Flush pending review ratings to server
  syncPendingRatings: async (): Promise<number> => {
    const online = await OfflineManager.isOnline();
    if (!online) return 0;

    const pending = await OfflineManager.getPendingRatings();
    if (pending.length === 0) return 0;

    let syncedCount = 0;
    const remaining: PendingRating[] = [];

    for (const item of pending) {
      try {
        await apiFetch('/flashcards/review', {
          method: 'POST',
          body: JSON.stringify({
            cardId: item.cardId,
            rating: item.rating,
            currentData: item.currentData,
          }),
        });
        syncedCount++;
      } catch (e) {
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(PENDING_RATINGS_KEY, JSON.stringify(remaining));
    return syncedCount;
  },

  // Cache user's course list
  cacheCourses: async (courses: any[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(COURSES_CACHE_KEY, JSON.stringify(courses));
    } catch (e) {
      console.warn('Failed to cache courses:', e);
    }
  },

  getCachedCourses: async (): Promise<any[]> => {
    try {
      const data = await AsyncStorage.getItem(COURSES_CACHE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
};
