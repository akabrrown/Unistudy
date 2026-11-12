---
name: unistudy-agent-eval-assurance
description: Enforces evidence-bound AI evaluation contracts, non-compensatory safety invariants, and deterministic release gates for UniStudy AI features.
---

# UniStudy Agent Eval Assurance (QA Automation Evals Pattern)

## When to Use
Use before merging any change to `shared/lib/`, `shared/constants/aiModels.ts`, `frontend/src/app/api/ai/`, or `backend/src/routes/ai.ts`.

## Core Invariants
1. **Outcome Before Rhetoric**: Validate actual structured payloads (`Zod`), citation IDs, and grounding metrics via `EvalReceipt` (`shared/evals/qaContracts.ts`).
2. **Safety Is Non-Compensatory**: Any `prompt_injection_leak`, `phantom_citation`, `schema_violation`, or `ai_footprint_leak` blocks `computeReleaseGate` even if pass rate exceeds 90%.
3. **Unknown Is Not Green**: Missing provider output or parse errors become `BLOCKED` or `FAIL`, never a silent pass.
4. **Verify Command**: Run `cd backend; npx tsx --test ../shared/lib/*.test.ts ../shared/evals/evalRunner.test.ts`.

