/**
 * Robust, Long-Term Persistent Storage for UniStudy AI Chat
 * 
 * Solves browser storage eviction, 5MB localStorage quota limits,
 * and cross-device session synchronization.
 * 
 * Strategy:
 * 1. Persistent Storage Permission (immune to 7-day browser purge)
 * 2. IndexedDB Engine (unlimited local capacity, multi-megabyte safety)
 * 3. Supabase Cloud Sync (restores conversations across any device)
 * 4. LocalStorage fast-mirror (0ms initial render)
 */

export interface StoredSessionPayload {
  sessions: any[];
  activeSessionId: string | null;
  updatedAt: string;
}

const DB_NAME = 'UniStudyChatDB';
const DB_VERSION = 1;
const STORE_NAME = 'chat_sessions';
const SESSIONS_KEY = 'current_user_sessions';

/**
 * Request permanent browser storage permission so OS/browser cache
 * sweep algorithms (like Apple WebKit 7-day purge) never delete chat history.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    }
  } catch (err) {
    console.warn('[ChatStorage] Storage persistence request notice:', err);
  }
  return false;
}

/**
 * Open or create the IndexedDB store
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save sessions to IndexedDB
 */
export async function saveSessionsToIndexedDB(
  sessions: any[],
  activeSessionId: string | null
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredSessionPayload = {
        sessions,
        activeSessionId,
        updatedAt: new Date().toISOString(),
      };
      const putReq = store.put(record, SESSIONS_KEY);

      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (err) {
    console.warn('[ChatStorage] IndexedDB write notice:', err);
  }
}

/**
 * Load sessions from IndexedDB
 */
export async function loadSessionsFromIndexedDB(): Promise<StoredSessionPayload | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(SESSIONS_KEY);

      getReq.onsuccess = () => {
        resolve(getReq.result || null);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('[ChatStorage] IndexedDB read notice:', err);
    return null;
  }
}

/**
 * Push sessions to Cloud Backup
 */
export async function pushSessionsToCloud(
  sessions: any[],
  activeSessionId: string | null
): Promise<boolean> {
  if (typeof window === 'undefined' || !sessions || sessions.length === 0) return false;
  try {
    const res = await fetch('/api/chat/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions, activeSessionId }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[ChatStorage] Cloud sync upload notice:', err);
    return false;
  }
}

/**
 * Pull sessions from Cloud Backup
 */
export async function pullSessionsFromCloud(): Promise<StoredSessionPayload | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/chat/sync', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.sessions) && data.sessions.length > 0) {
      return {
        sessions: data.sessions,
        activeSessionId: data.activeSessionId || null,
        updatedAt: data.lastSynced || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[ChatStorage] Cloud sync download notice:', err);
  }
  return null;
}
