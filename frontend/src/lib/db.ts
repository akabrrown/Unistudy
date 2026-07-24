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

export class UniStudyDB extends Dexie {
  downloaded_courses!: Table<DownloadedCourse>;
  downloaded_lectures!: Table<DownloadedLecture>;
  downloaded_slides!: Table<DownloadedSlide>;
  downloaded_flashcards!: Table<DownloadedFlashcard>;

  constructor() {
    super('UniStudyDB');
    this.version(1).stores({
      downloaded_courses: 'id, downloaded_at',
      downloaded_lectures: 'id, course_id',
      downloaded_slides: 'id, lecture_id, slide_index',
      downloaded_flashcards: 'id, course_id'
    });
  }
}

export const db = new UniStudyDB();
