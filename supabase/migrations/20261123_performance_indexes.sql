-- ==============================================================================
-- Migration: 20261123_performance_indexes.sql
-- Description: Composite B-Tree indexes on high-frequency relational foreign keys
-- to eliminate sequential table scans during RLS checks and lecture slide fetches.
-- ==============================================================================

-- 1. SLIDES: Fast deck ordering and RLS join lookup
CREATE INDEX IF NOT EXISTS idx_slides_lecture_slide 
  ON public.slides(lecture_id, slide_number ASC);

-- 2. LECTURES: Fast course lookup and cascade RLS joins
CREATE INDEX IF NOT EXISTS idx_lectures_course_id 
  ON public.lectures(course_id);

-- 3. COURSES: Fast student course listing and primary RLS ownership check
CREATE INDEX IF NOT EXISTS idx_courses_user_id 
  ON public.courses(user_id);

-- 4. SLIDE NOTES: Instant note lookups per student and slide
CREATE INDEX IF NOT EXISTS idx_slide_notes_user_slide 
  ON public.slide_notes(user_id, slide_id);

-- 5. FLASHCARDS: Fast study deck query by student and lecture
CREATE INDEX IF NOT EXISTS idx_flashcards_user_lecture 
  ON public.flashcards(user_id, lecture_id);

-- 6. QUIZ ATTEMPTS: Fast history lookups by student
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_course 
  ON public.quiz_attempts(user_id, course_id);
