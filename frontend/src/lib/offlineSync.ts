import { db, CachedSlideNote, CachedLectureDeck, SyncQueueItem } from './db';
import { apiFetch } from './api/client';
import { getOptimizedSlideUrl, isPlaceholderSlideUrl } from './images';

// In-memory cache for ultra-fast 0ms synchronous lookups
const inMemoryNotes = new Map<string, string>();
const preloadedImages = new Set<string>();

/**
 * Predictively pre-fetches adjacent slide images into the browser's image cache.
 * When the student flips to the next slide, it renders instantly from memory.
 */
export function preloadSlideAssets(
  slides: Array<{ image_url?: string }>,
  currentIndex: number,
  lookahead: number = 2
): void {
  if (typeof window === 'undefined' || !Array.isArray(slides) || slides.length === 0) return;

  const start = Math.max(0, currentIndex - 1);
  const end = Math.min(slides.length - 1, currentIndex + lookahead);

  for (let i = start; i <= end; i++) {
    const rawUrl = slides[i]?.image_url;
    if (!rawUrl || isPlaceholderSlideUrl(rawUrl)) continue;

    const optimizedUrl = getOptimizedSlideUrl(rawUrl);
    if (!optimizedUrl || preloadedImages.has(optimizedUrl)) continue;

    preloadedImages.add(optimizedUrl);

    // Create an unrendered Image instance to force browser network pre-fetch and decode
    const img = new Image();
    img.decoding = 'async';
    img.src = optimizedUrl;
  }
}

/**
 * 0ms Note Fetch: Reads from RAM first, then IndexedDB, then LocalStorage.
 * Background revalidates against the database without blocking the UI.
 */
export async function getSlideNoteFast(
  slideId: string,
  onServerUpdate?: (content: string) => void
): Promise<string> {
  if (!slideId) return '';

  // 1. Instant RAM Cache (0.01ms)
  if (inMemoryNotes.has(slideId)) {
    const mem = inMemoryNotes.get(slideId)!;
    // Trigger non-blocking background revalidation
    if (onServerUpdate) void revalidateNoteFromServer(slideId, mem, onServerUpdate);
    return mem;
  }

  // 2. Instant LocalStorage fallback (0.2ms)
  if (typeof window !== 'undefined') {
    try {
      const ls = localStorage.getItem(`slideNote_${slideId}`);
      if (ls !== null) {
        inMemoryNotes.set(slideId, ls);
        if (onServerUpdate) void revalidateNoteFromServer(slideId, ls, onServerUpdate);
        return ls;
      }
    } catch {}
  }

  // 3. IndexedDB read (< 2ms)
  try {
    const record = await db.cached_notes.get(slideId);
    if (record) {
      inMemoryNotes.set(slideId, record.content);
      if (onServerUpdate) void revalidateNoteFromServer(slideId, record.content, onServerUpdate);
      return record.content;
    }
  } catch {}

  // 4. If completely empty locally, fetch from database
  if (onServerUpdate) {
    void revalidateNoteFromServer(slideId, '', onServerUpdate);
  }
  return '';
}

async function revalidateNoteFromServer(
  slideId: string,
  currentLocal: string,
  onServerUpdate: (content: string) => void
): Promise<void> {
  try {
    const remote = await apiFetch(`/lectures/${slideId}/notes`);
    const remoteContent = remote?.content || '';
    if (remoteContent && remoteContent !== currentLocal) {
      inMemoryNotes.set(slideId, remoteContent);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(`slideNote_${slideId}`, remoteContent); } catch {}
      }
      await db.cached_notes.put({
        slideId,
        content: remoteContent,
        updatedAt: Date.now(),
        syncStatus: 'synced',
      });
      onServerUpdate(remoteContent);
    }
  } catch {
    // Non-blocking: student continues studying with local copy
  }
}

/**
 * 0ms Optimistic Note Save:
 * Writes to RAM, LocalStorage, and IndexedDB instantly.
 * Flushes to database in the background. If offline, queues for auto-sync.
 */
export async function saveSlideNoteFast(slideId: string, content: string): Promise<void> {
  if (!slideId) return;

  // 1. Instant Local Updates (0ms)
  inMemoryNotes.set(slideId, content);
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(`slideNote_${slideId}`, content); } catch {}
  }

  try {
    await db.cached_notes.put({
      slideId,
      content,
      updatedAt: Date.now(),
      syncStatus: 'pending',
    });
  } catch {}

  // 2. Background Database Sync
  void (async () => {
    try {
      await apiFetch(`/lectures/${slideId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      // Mark synced in local database
      await db.cached_notes.update(slideId, { syncStatus: 'synced' });
    } catch (err) {
      console.warn('[OfflineSync] Server sync queued for reconnection:', err);
      // Enqueue mutation for background retry
      try {
        await db.sync_queue.add({
          action: 'save_note',
          payload: { slideId, content },
          createdAt: Date.now(),
          retries: 0,
        });
      } catch {}
    }
  })();
}

/**
 * 0ms Deck Cache: Loads cached lecture slides from IndexedDB instantly,
 * eliminating the initial 1-2s database network wait when re-opening a deck.
 */
export async function getCachedDeckFast(lectureId: string): Promise<any[] | null> {
  if (!lectureId) return null;
  try {
    const record = await db.cached_decks.get(lectureId);
    if (record && Array.isArray(record.slides) && record.slides.length > 0) {
      return record.slides;
    }
  } catch {}
  return null;
}

export async function setCachedDeckFast(lectureId: string, slides: any[]): Promise<void> {
  if (!lectureId || !Array.isArray(slides) || slides.length === 0) return;
  try {
    await db.cached_decks.put({
      lectureId,
      slides,
      cachedAt: Date.now(),
    });
  } catch {}
}

/**
 * 0ms Flashcard Cache: Reads and saves flashcards in Dexie IndexedDB.
 */
export async function getCachedFlashcardsFast(courseId: string): Promise<any[] | null> {
  if (!courseId) return null;
  try {
    const record = await db.cached_flashcard_decks.get(courseId);
    if (record && Array.isArray(record.flashcards) && record.flashcards.length > 0) {
      return record.flashcards;
    }
  } catch {}
  return null;
}

export async function setCachedFlashcardsFast(courseId: string, flashcards: any[]): Promise<void> {
  if (!courseId || !Array.isArray(flashcards)) return;
  try {
    await db.cached_flashcard_decks.put({
      courseId,
      flashcards,
      cachedAt: Date.now(),
    });
  } catch {}
}

/**
 * 0ms Course Lectures Cache
 */
export async function getCachedCourseLecturesFast(courseId: string): Promise<any[] | null> {
  if (!courseId) return null;
  try {
    const record = await db.cached_course_lectures.get(courseId);
    if (record && Array.isArray(record.lectures) && record.lectures.length > 0) {
      return record.lectures;
    }
  } catch {}
  return null;
}

export async function setCachedCourseLecturesFast(courseId: string, lectures: any[]): Promise<void> {
  if (!courseId || !Array.isArray(lectures)) return;
  try {
    await db.cached_course_lectures.put({
      courseId,
      lectures,
      cachedAt: Date.now(),
    });
  } catch {}
}

/**
 * 0ms Dashboard Snapshot Cache
 */
export async function getCachedDashboardSnapshotFast(userId: string): Promise<any | null> {
  if (!userId) return null;
  try {
    const record = await db.cached_dashboard_snapshots.get(userId);
    if (record?.snapshot) {
      return record.snapshot;
    }
  } catch {}
  return null;
}

export async function setCachedDashboardSnapshotFast(userId: string, snapshot: any): Promise<void> {
  if (!userId || !snapshot) return;
  try {
    await db.cached_dashboard_snapshots.put({
      userId,
      snapshot,
      cachedAt: Date.now(),
    });
  } catch {}
}

/**
 * Background Queue Drainer: Automatically flushes pending mutations
 * whenever the student's browser reconnects to the network.
 */
export async function drainOfflineSyncQueue(): Promise<number> {
  try {
    const pending = await db.sync_queue.toArray();
    if (pending.length === 0) return 0;

    let processed = 0;
    for (const item of pending) {
      if (!item.id) continue;
      try {
        if (item.action === 'save_note' && item.payload?.slideId) {
          await apiFetch(`/lectures/${item.payload.slideId}/notes`, {
            method: 'POST',
            body: JSON.stringify({ content: item.payload.content }),
          });
          await db.cached_notes.update(item.payload.slideId, { syncStatus: 'synced' });
        } else if (item.action === 'review_card' && item.payload?.cardId) {
          const { submitFlashcardReview } = await import('@/app/actions/flashcards');
          await submitFlashcardReview(item.payload.cardId, item.payload.rating, item.payload.currentData);
        }
        await db.sync_queue.delete(item.id);
        processed++;
      } catch (err) {
        // Increment retry count
        await db.sync_queue.update(item.id, { retries: (item.retries || 0) + 1 });
      }
    }
    return processed;
  } catch {
    return 0;
  }
}

// Auto-register online event listener in the browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void drainOfflineSyncQueue();
  });
}
