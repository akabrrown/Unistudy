import { supabase } from './supabase';
import { getDb } from './db';
import * as FileSystem from 'expo-file-system';

export async function downloadCourse(courseId: string) {
  try {
    const db = await getDb();
    
    // 1. Fetch Course details
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
      
    if (courseErr) throw new Error('Failed to fetch course');

    await db.runAsync(
      `INSERT OR REPLACE INTO downloaded_courses (id, title, course_code, description, downloaded_at) VALUES (?, ?, ?, ?, ?)`,
      [course.id, course.title, course.course_code || '', course.description || '', Date.now()]
    );

    // 2. Fetch Flashcards
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('*')
      .eq('course_id', courseId);
      
    if (flashcards) {
      for (const fc of flashcards) {
        await db.runAsync(
          `INSERT OR REPLACE INTO downloaded_flashcards (id, course_id, front, back) VALUES (?, ?, ?, ?)`,
          [fc.id, fc.course_id, fc.front || '', fc.back || '']
        );
      }
    }

    // 3. Fetch Lectures
    const { data: lectures } = await supabase
      .from('lectures')
      .select('*')
      .eq('course_id', courseId);
      
    if (lectures) {
      for (const lec of lectures) {
        await db.runAsync(
          `INSERT OR REPLACE INTO downloaded_lectures (id, course_id, title, description) VALUES (?, ?, ?, ?)`,
          [lec.id, lec.course_id, lec.title || '', lec.description || '']
        );

        // Fetch Slides for this lecture
        const { data: slides } = await supabase
          .from('slides')
          .select('*')
          .eq('lecture_id', lec.id);
          
        if (slides) {
          for (const slide of slides) {
            let localImageUri = '';
            
            // Download slide image if exists
            if (slide.image_url) {
              try {
                const filename = slide.image_url.split('/').pop() || `${slide.id}.jpg`;
                const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
                
                const { uri } = await FileSystem.downloadAsync(slide.image_url, fileUri);
                localImageUri = uri;
              } catch (imgErr) {
                console.error('Failed to download image for slide', slide.id, imgErr);
              }
            }

            await db.runAsync(
              `INSERT OR REPLACE INTO downloaded_slides (id, lecture_id, slide_index, raw_text, explanation, image_local_uri) VALUES (?, ?, ?, ?, ?, ?)`,
              [slide.id, slide.lecture_id, slide.slide_index || 0, slide.raw_text || '', slide.explanation || '', localImageUri]
            );
          }
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error downloading course:', err);
    throw err;
  }
}

export async function isCourseDownloaded(courseId: string) {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync('SELECT id FROM downloaded_courses WHERE id = ?', [courseId]);
    return !!result;
  } catch {
    return false;
  }
}

export async function removeDownloadedCourse(courseId: string) {
  try {
    const db = await getDb();
    await db.runAsync('DELETE FROM downloaded_flashcards WHERE course_id = ?', [courseId]);
    
    const lectures = await db.getAllAsync('SELECT id FROM downloaded_lectures WHERE course_id = ?', [courseId]) as any[];
    for (const lec of lectures) {
      await db.runAsync('DELETE FROM downloaded_slides WHERE lecture_id = ?', [lec.id]);
    }
    
    await db.runAsync('DELETE FROM downloaded_lectures WHERE course_id = ?', [courseId]);
    await db.runAsync('DELETE FROM downloaded_courses WHERE id = ?', [courseId]);
    
    // Note: To be fully clean, we should also delete the cached images from the filesystem.
    return true;
  } catch {
    return false;
  }
}
