import { createClient } from '@/lib/supabase/client';
import { db } from './db';

export async function downloadCourse(courseId: string) {
  try {
    const supabase = createClient();
    
    // 1. Fetch Course details
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
      
    if (courseErr) throw new Error('Failed to fetch course');

    await db.downloaded_courses.put({
      id: course.id,
      title: course.title,
      course_code: course.course_code || '',
      description: course.description || '',
      downloaded_at: Date.now()
    });

    // 2. Fetch Flashcards
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('*')
      .eq('course_id', courseId);
      
    if (flashcards) {
      await db.downloaded_flashcards.bulkPut(
        flashcards.map(fc => ({
          id: fc.id,
          course_id: fc.course_id,
          front: fc.front || '',
          back: fc.back || ''
        }))
      );
    }

    // 3. Fetch Lectures
    const { data: lectures } = await supabase
      .from('lectures')
      .select('*')
      .eq('course_id', courseId);
      
    if (lectures) {
      await db.downloaded_lectures.bulkPut(
        lectures.map(lec => ({
          id: lec.id,
          course_id: lec.course_id,
          title: lec.title || '',
          description: lec.description || ''
        }))
      );

      // Fetch Slides for all lectures
      const lectureIds = lectures.map(l => l.id);
      if (lectureIds.length > 0) {
        const { data: slides } = await supabase
          .from('slides')
          .select('*')
          .in('lecture_id', lectureIds);
          
        if (slides) {
          const slideRecords = await Promise.all(slides.map(async slide => {
            let image_blob: Blob | null = null;
            if (slide.image_url) {
              try {
                const res = await fetch(slide.image_url);
                if (res.ok) {
                  image_blob = await res.blob();
                }
              } catch (e) {
                console.error("Failed to fetch image blob", e);
              }
            }
            
            return {
              id: slide.id,
              lecture_id: slide.lecture_id,
              slide_index: slide.slide_index || 0,
              raw_text: slide.raw_text || '',
              explanation: slide.explanation || '',
              image_blob
            };
          }));
          
          await db.downloaded_slides.bulkPut(slideRecords);
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
    const count = await db.downloaded_courses.where('id').equals(courseId).count();
    return count > 0;
  } catch {
    return false;
  }
}

export async function removeDownloadedCourse(courseId: string) {
  try {
    await db.downloaded_courses.where('id').equals(courseId).delete();
    await db.downloaded_flashcards.where('course_id').equals(courseId).delete();
    
    const lectures = await db.downloaded_lectures.where('course_id').equals(courseId).toArray();
    const lectureIds = lectures.map(l => l.id);
    
    if (lectureIds.length > 0) {
      await db.downloaded_slides.where('lecture_id').anyOf(lectureIds).delete();
      await db.downloaded_lectures.where('course_id').equals(courseId).delete();
    }
    
    return true;
  } catch {
    return false;
  }
}
