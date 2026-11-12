---
name: unistudy-latex-vision-ocr
description: Formats STEM handwritten note transcriptions, tables, and formulas with MixTeX-compatible KaTeX $ and $$ delimiters and low-temperature vision fallbacks.
---

# UniStudy LaTeX & Vision OCR (MixTeX Pattern)

## When to Use
Use when editing `frontend/src/app/api/ai/scan-notes/route.ts`, `backend/src/routes/ai.ts` (`/scan-notes`), or `shared/lib/latexNormalizer.ts`.

## Core Pattern
1. **Strict OCR Fidelity**: Set `temperature: 0.1` on Gemini and OpenRouter vision calls; forbid inventing facts outside the image (mark unreadable words `[illegible]`).
2. **KaTeX Delimiter Normalization**: Run `normalizeLatexMarkdown` (`shared/lib/latexNormalizer.ts`) to strip ` ```markdown ` wrappers and convert `\(...\)` -> `$...$` and `\[...\]` -> `$$...$$` while protecting fenced code blocks.
3. **Tables & Diagrams**: Preserve GFM Markdown tables and add brief diagram descriptions without external extrapolation.

