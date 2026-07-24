import { z } from 'zod';

export const CourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});

export const LectureSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(3),
  youtube_url: z.string().url().optional(),
});

export const FlashcardGenerationSchema = z.object({
  slideIds: z.array(z.string().uuid()),
  imageBase64Array: z.array(z.string()),
});

export const QuizGenerationSchema = z.object({
  lectureId: z.string().uuid(),
  imageBase64Array: z.array(z.string()),
  questionCount: z.number().min(1).max(20).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});
