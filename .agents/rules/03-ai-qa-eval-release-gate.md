---
trigger: model_decision
description: Apply when evaluating AI accuracy, modifying golden eval cases, or shipping prompt/model changes
---
# QA Agent Eval & Non-Compensatory Release Gate Rules

1. **Outcome Before Rhetoric**: Never trust raw model prose as proof of correctness; assert against typed `EvalReceipt` checks in `shared/evals/qaContracts.ts`.
2. **Safety Is Non-Compensatory**: Any `prompt_injection_leak`, `phantom_citation`, `schema_violation`, `ai_footprint_leak`, or `secret_exposure` fails the release gate regardless of average scores.
3. **Unknown Is Not Green**: Missing evidence or unreachable providers return `BLOCKED` and block automated release approval.
4. **Required Regression Tests**: Whenever fixing an AI bug or tuning prompts, add a curated case to `shared/evals/goldenDataset.ts` and pass:
   - `cd backend; npx tsx --test ../shared/lib/*.test.ts ../shared/evals/evalRunner.test.ts`
   - `cd backend; npx tsc --noEmit`
   - `cd frontend; npm run build`

