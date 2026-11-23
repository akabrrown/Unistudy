import Dexie, { Table } from 'dexie';

export interface DownloadedCourse {
  id: string;
  title: string;
  course_code: string;
  description: string;
  downloaded_at: number;
}

export interface DownloadedLecture {
  id: string;
  course_id: string;
  title: string;
  description: string;
}

export interface DownloadedSlide {
  id: string;
  lecture_id: string;
  slide_index: number;
  raw_text: string;
  explanation: string;
  image_blob: Blob | null;
}

export interface DownloadedFlashcard {
  id: string;
  course_id: string;
  front: string;
  back: string;
}

export interface CachedSlideNote {
  slideId: string;
  content: string;
  updatedAt: number;
  syncStatus: 'synced' | 'pending';
}

export interface CachedLectureDeck {
  lectureId: string;
  slides: any[];
  cachedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  action: 'save_note' | 'save_progress';
  payload: any;
  createdAt: number;
  retries: number;
}

export class UniStudyDB extends Dexie {
  downloaded_courses!: Table<DownloadedCourse>;
  downloaded_lectures!: Table<DownloadedLecture>;
  downloaded_slides!: Table<DownloadedSlide>;
  downloaded_flashcards!: Table<DownloadedFlashcard>;
  cached_notes!: Table<CachedSlideNote, string>;
  cached_decks!: Table<CachedLectureDeck, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('UniStudyDB');
    this.version(1).stores({
      downloaded_courses: 'id, downloaded_at',
      downloaded_lectures: 'id, course_id',
      downloaded_slides: 'id, lecture_id, slide_index',
      downloaded_flashcards: 'id, course_id'
    });
    this.version(2).stores({
      cached_notes: 'slideId, syncStatus, updatedAt',
      cached_decks: 'lectureId, cachedAt',
      sync_queue: '++id, action, createdAt'
    });
  }
}

export const db = new UniStudyDB();
