"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizGenerationSchema = exports.FlashcardGenerationSchema = exports.LectureSchema = exports.CourseSchema = void 0;
const zod_1 = require("zod");
exports.CourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().optional(),
});
exports.LectureSchema = zod_1.z.object({
    course_id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3),
    youtube_url: zod_1.z.string().url().optional(),
});
exports.FlashcardGenerationSchema = zod_1.z.object({
    slideIds: zod_1.z.array(zod_1.z.string().uuid()),
    imageBase64Array: zod_1.z.array(zod_1.z.string()),
});
exports.QuizGenerationSchema = zod_1.z.object({
    lectureId: zod_1.z.string().uuid(),
    imageBase64Array: zod_1.z.array(zod_1.z.string()),
    questionCount: zod_1.z.number().min(1).max(20).default(5),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']).default('medium'),
});
