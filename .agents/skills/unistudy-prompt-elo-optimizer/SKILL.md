---
name: unistudy-prompt-elo-optimizer
description: Benchmarks and ranks candidate UniStudy system prompts and small-vs-large model distills using ELO scoring against the curated golden dataset.
---

# UniStudy Prompt ELO Optimizer (gpt-prompt-engineer Pattern)

## When to Use
Use when designing a new system prompt, tuning rubric/tutor instructions, or testing fast-model distillation (`openai/gpt-oss-120b` -> `openai/gpt-oss-20b` or `qwen/qwen3.8-27b`).

## Core Pattern
1. **Define Candidate Prompts + Golden Cases**: Add inputs and expected bounds/invariants to `shared/evals/goldenDataset.ts`.
2. **Score & Update ELO**: Use `expectedEloScore`, `updateEloPair`, and `rankPromptVariants` (`shared/evals/promptOptimizer.ts`, baseline `1200`) over head-to-head trial comparisons.
3. **Gate Promotion**: Only promote a higher-ELO prompt after deterministic invariants pass `shared/evals/evalRunner.test.ts` and `computeReleaseGate` approves.

