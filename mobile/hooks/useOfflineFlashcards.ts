import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { createClient } from '@supabase/supabase-js';

// We should use env vars here, but using a placeholder for the demo structure
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CACHE_PATH = ((FileSystem as any).documentDirectory || '') + 'flashcards.json';
const PENDING_PATH = ((FileSystem as any).documentDirectory || '') + 'pending_ratings.json';

export function useOfflineFlashcards() {
  
  // Download due cards when online
  const syncCards = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    
    // In a real app we'd filter by the logged in user
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .lte('next_review', new Date().toISOString());
      
    if (data) {
      await FileSystem.writeAsStringAsync(CACHE_PATH, JSON.stringify(data));
    }
  };

  // Read from local cache when offline
  const getCards = async () => {
    const exists = await FileSystem.getInfoAsync(CACHE_PATH);
    if (exists.exists) {
      const raw = await FileSystem.readAsStringAsync(CACHE_PATH);
      return JSON.parse(raw);
    }
    return [];
  };

  // Get pending ratings
  const getPendingRatings = async () => {
    const exists = await FileSystem.getInfoAsync(PENDING_PATH);
    if (exists.exists) {
      const raw = await FileSystem.readAsStringAsync(PENDING_PATH);
      return JSON.parse(raw);
    }
    return [];
  }

  // Store rating locally
  const rateCard = async (cardId: string, rating: string) => {
    const pending = await getPendingRatings();
    pending.push({ cardId, rating, ts: Date.now() });
    await FileSystem.writeAsStringAsync(PENDING_PATH, JSON.stringify(pending));
  };

  // Sync pending ratings when back online
  const syncRatings = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    
    const pending = await getPendingRatings();
    if (pending.length === 0) return;

    for (const r of pending) {
      // Send to main backend (pseudo-code path)
      // await fetch('https://api.unistudy.ai/api/flashcards/rate', { ... })
      
      console.log(`Synced rating for card ${r.cardId}`);
    }
    await FileSystem.deleteAsync(PENDING_PATH);
  };

  return { syncCards, getCards, rateCard, syncRatings };
}
