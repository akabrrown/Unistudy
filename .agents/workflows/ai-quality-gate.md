---
description: End-to-end verification and optimization workflow before shipping any UniStudy AI prompt, provider, or RAG change
---

# AI Quality Gate Workflow

1. **Inspect & Reproduce**: Identify the target feature (`shared/lib/aiTutor.ts`, `shared/lib/essayGrader.ts`, `shared/lib/flashcardExtractor.ts`, or `scan-notes`) and reproduce any failure by adding a case to `shared/evals/goldenDataset.ts`.
2. **Red Test**: Run deterministic unit + golden eval tests from `backend/`:
   ```powershell
   cd backend; npx tsx --test ../shared/lib/essayGrader.test.ts ../shared/lib/flashcardExtractor.test.ts ../shared/lib/groundingVerifier.test.ts ../shared/lib/latexNormalizer.test.ts ../shared/evals/evalRunner.test.ts
   ```
3. **Minimal Implementation**:
   - Keep structured tasks at `temperature: 0.1–0.2` and tutoring/rewrites at `0.55`.
   - Pass outputs through `stripAiWritingFootprints` / `sanitizeTutorResponse` / `normalizeLatexMarkdown` / `stripPhantomSlideCitations`.
4. **Green & Typecheck Gates**:
   - Re-run all tests above (`0` failures required).
   - Run `cd backend; npx tsc --noEmit`, `cd mobile; npx tsc --noEmit`, and `cd frontend; npm run build`.
5. **Optional Live Benchmark (Requires explicit user opt-in for API quota)**:
   ```powershell
   cd backend; npx tsx ../shared/evals/runLiveEvals.ts
   ```
   Verify `computeReleaseGate` returns `approved: true` with zero `safetyViolations`.

