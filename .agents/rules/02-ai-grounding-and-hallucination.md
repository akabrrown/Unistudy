---
trigger: model_decision
description: Apply when touching AI Tutor, RAG search, slide explanations, flashcards, or MixTeX/OCR note scanning
---
# AI Grounding, Anti-Hallucination & Pedagogy Rules (LettuceDetect + Mr. Ranedeer + MixTeX)

1. **Citation & Retrieval Grounding**: Every factual slide claim in Tutor and Flashcards must cite `[Slide N]`. Run cross-slide retrieval (`retrieveRelevantSlideChunks` or `match_study_content` + Cohere rerank) before answering.
2. **Honest Gap Handling**: If retrieved slides do not cover the student's question, the model must explicitly say `"This is not covered in the provided lecture slides"` before offering optional `"General background (outside lecture):"` context.
3. **Span-Level Hallucination Verification**: Run `verifyResponseGrounding` and `stripPhantomSlideCitations` (`shared/lib/groundingVerifier.ts`) to remove non-existent `[Slide N]` references and catch numeric contradictions.
4. **Student Personalization Profile**: Respect `user_settings` (`ai_tutor_name`, `ai_tone`, `ai_reading_level`, `learning_style`, `language`) and `/test` or `/plan` command modes in `buildGroundedTutorPrompt` without adding spammy promos or excessive emojis.
5. **MixTeX Math & OCR Fidelity**: Normalize vision and math replies with `normalizeLatexMarkdown` (`shared/lib/latexNormalizer.ts`) so KaTeX `$...$` and `$$...$$` render cleanly and OCR uses `temperature: 0.1` without fabricating unseen facts.

