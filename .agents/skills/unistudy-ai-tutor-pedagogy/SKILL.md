---
name: unistudy-ai-tutor-pedagogy
description: Configures UniStudy AI Tutor personalization (depth, learning style, communication style, tone, reasoning framework) and interactive /test and /plan modes grounded in lecture slides.
---

# UniStudy AI Tutor Pedagogy (Mr. Ranedeer Pattern)

## When to Use
Use when editing `shared/lib/aiTutor.ts`, `frontend/src/app/api/ai/ask/route.ts`, `backend/src/routes/ai.ts` (`/ask` or `/explain`), or lecture tutor UI components.

## Core Pattern
1. **Student Profile Mapping**: Populate `StudentTutorConfig` from `user_settings` (`ai_reading_level`, `learning_style`, `ai_tone`, `language`) alongside `ai_tutor_name`.
2. **Command Modes**: Detect `/test` (2-3 grounded practice questions without spoiling answers immediately) and `/plan` (prerequisite `0.x` -> main `1.x` study roadmap) via `detectTutorCommandMode`.
3. **Boundaries**:
   - Keep `temperature: 0.55` across Groq, Gemini, and OpenRouter.
   - Wrap slide context in XML tags and strip emojis/spammy promos while keeping Markdown headers, bold terms, KaTeX `$...$` / `$$...$$`, and code blocks clean via `sanitizeTutorResponse`.

