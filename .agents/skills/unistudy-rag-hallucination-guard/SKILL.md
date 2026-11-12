---
name: unistudy-rag-hallucination-guard
description: Verifies RAG retrieval and span-level grounding against source slides using LettuceDetect-inspired citation checks, numeric fidelity verification, and honest out-of-scope fallbacks.
---

# UniStudy RAG & Hallucination Guard (LettuceDetect Pattern)

## When to Use
Use when modifying slide retrieval, vector search (`backend/src/routes/search.ts`), AI Tutor grounding, or Flashcard generation.

## Core Pattern
1. **Retrieve First**: Rank lecture slides with `retrieveRelevantSlideChunks` (`shared/lib/aiTutor.ts`) or `match_study_content` + Cohere rerank before calling any LLM.
2. **Verify Spans Post-Generation**: Run `verifyResponseGrounding(answer, sources)` (`shared/lib/groundingVerifier.ts`) to detect:
   - `phantom_citation` (`[Slide N]` referencing non-existent slide numbers)
   - `numeric_mismatch` (contradictory figures or percentages inside cited claims)
   - `low_source_overlap` (unsupported claims attributed to slides)
3. **Enforce Clean Output**: Strip phantom citations with `stripPhantomSlideCitations`, and ensure out-of-scope questions disclose `"This is not covered in the provided lecture slides"` before optional general knowledge.

