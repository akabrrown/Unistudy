import * as SQLite from 'expo-sqlite';

export async function getDb() {
  const db = await SQLite.openDatabaseAsync('unistudy.db');
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS downloaded_courses (
      id TEXT PRIMARY KEY,
      title TEXT,
      course_code TEXT,
      description TEXT,
      downloaded_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS downloaded_lectures (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      title TEXT,
      description TEXT,
      FOREIGN KEY(course_id) REFERENCES downloaded_courses(id)
    );
    CREATE TABLE IF NOT EXISTS downloaded_slides (
      id TEXT PRIMARY KEY,
      lecture_id TEXT,
      slide_index INTEGER,
      raw_text TEXT,
      explanation TEXT,
      image_local_uri TEXT,
      FOREIGN KEY(lecture_id) REFERENCES downloaded_lectures(id)
    );
    CREATE TABLE IF NOT EXISTS downloaded_flashcards (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      front TEXT,
      back TEXT,
      FOREIGN KEY(course_id) REFERENCES downloaded_courses(id)
    );
  `);
  
  return db;
}
