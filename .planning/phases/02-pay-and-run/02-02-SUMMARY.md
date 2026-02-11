---
phase: 02-pay-and-run
plan: 02
subsystem: benchmark-engine
tags: [vitest, tdd, json-compare, backoff, cost-tracker, openrouter, vision-api]

# Dependency graph
requires:
  - phase: 01-configure-benchmark
    provides: "Curated model list (CURATED_MODELS), benchmark types, config constants"
provides:
  - "JSON canonicalization and comparison (strict + relaxed modes)"
  - "Field-level accuracy scoring with dot-notation flattening"
  - "Adaptive backoff with exponential delay and Retry-After support"
  - "Cost tracker with reservation pattern and dual ceiling enforcement"
  - "Single-model runner for OpenRouter vision API with mock mode"
  - "Vitest test infrastructure with path alias resolution"
affects: [02-pay-and-run, 03-results-and-share]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [tdd-red-green-refactor, reservation-pattern, exponential-backoff-with-jitter, json-canonicalization]

key-files:
  created:
    - src/lib/benchmark/json-compare.ts
    - src/lib/benchmark/json-compare.test.ts
    - src/lib/benchmark/backoff.ts
    - src/lib/benchmark/backoff.test.ts
    - src/lib/benchmark/cost-tracker.ts
    - src/lib/benchmark/cost-tracker.test.ts
    - src/lib/benchmark/runner.ts
    - vitest.config.ts
  modified:
    - package.json

key-decisions:
  - "CostTracker uses softCeiling as hardCeiling when only one arg provided (single budget = both ceilings)"
  - "Vitest with node environment and path alias resolution matching tsconfig @/ -> src/"
  - "Mock runner seeds random from modelId+imageUrl for deterministic varied results per model"

patterns-established:
  - "TDD pattern: write failing tests first, implement to pass, refactor"
  - "Reservation pattern: reserve -> record/release lifecycle for concurrent budget tracking"
  - "Backoff pattern: withBackoff wraps async fn, retries only on 429, respects Retry-After"
  - "JSON comparison: canonicalize first, then compare (strict or relaxed normalization)"

# Metrics
duration: 14min
completed: 2026-02-11
---

# Phase 02 Plan 02: Benchmark Engine Utilities Summary

**TDD-built JSON comparison (strict/relaxed), adaptive backoff, cost tracker with reservation pattern, and OpenRouter vision runner with mock mode -- 50 tests passing**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-11T23:00:26Z
- **Completed:** 2026-02-11T23:14:53Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- JSON canonicalization and comparison supporting both strict mode (null != missing, no coercion) and relaxed mode (null == missing, "1" == 1, whitespace collapsed)
- Field-level accuracy scoring with dot-notation flattening for nested JSON and array bracket notation
- Adaptive backoff with exponential delay, jitter, Retry-After header support, and configurable max retries
- Cost tracker using reservation pattern to prevent overspending with concurrent API calls (dual soft/hard ceiling)
- OpenRouter vision API runner with mock mode producing realistic varied data seeded by model ID
- Vitest test infrastructure established with 50 tests across 3 test suites

## Task Commits

Each task was committed atomically:

1. **Task 1: JSON canonicalization and comparison with strict and relaxed matching modes (TDD)** - `95952e3` (feat)
2. **Task 2: Adaptive backoff, cost tracker, and model runner (TDD)** - `5fa4203` (feat)

_Note: TDD tasks combine test + implementation commits as single atomic units_

## Files Created/Modified
- `src/lib/benchmark/json-compare.ts` - Canonicalize, compareStrict, compareRelaxed, calculateFieldAccuracy, diffFields
- `src/lib/benchmark/json-compare.test.ts` - 32 tests for all comparison modes and edge cases
- `src/lib/benchmark/backoff.ts` - withBackoff() for adaptive retry on 429 with exponential delay
- `src/lib/benchmark/backoff.test.ts` - 7 tests with fake timers for retry behavior
- `src/lib/benchmark/cost-tracker.ts` - CostTracker class with reserve/record/release lifecycle
- `src/lib/benchmark/cost-tracker.test.ts` - 11 tests for reservation pattern and ceiling enforcement
- `src/lib/benchmark/runner.ts` - runModelBenchmark() for OpenRouter API with mock mode
- `vitest.config.ts` - Vitest configuration with @/ path alias resolution
- `package.json` - Added vitest dev dependency, test and test:watch scripts

## Decisions Made
- CostTracker uses softCeiling as hardCeiling when constructed with single argument (avoids surprising behavior where spending the full budget doesn't trigger abort)
- Vitest configured with node environment (not jsdom) since benchmark utilities are server-side
- Mock runner uses deterministic seeded PRNG from modelId+imageUrl to produce consistent but varied results across models
- Backoff jitter uses random 0-1000ms to prevent thundering herd on rate limit recovery

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CostTracker single-arg constructor behavior**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** CostTracker(5) set softCeiling=5 but hardCeiling defaulted to 15, so shouldAbort() returned false when spent reached the provided ceiling
- **Fix:** Made hardCeiling optional, defaulting to softCeiling when not explicitly provided
- **Files modified:** src/lib/benchmark/cost-tracker.ts
- **Verification:** All 11 cost tracker tests pass including shouldAbort and dual-ceiling tests
- **Committed in:** 5fa4203 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed backoff test timing with fake timers**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Test "retries on 429 status up to maxRetries" timed out because timer advances didn't account for jitter range
- **Fix:** Used generous timer advances in loop to cover base delay + max jitter
- **Files modified:** src/lib/benchmark/backoff.test.ts
- **Verification:** All 7 backoff tests pass with no timeouts or unhandled rejections
- **Committed in:** 5fa4203 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in src/lib/stripe/client.ts (Stripe API version mismatch) -- not related to this plan
- Pre-existing import of @/lib/benchmark/engine in Stripe webhook -- will be created in plan 02-03

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All benchmark utility modules ready for orchestration engine (plan 02-03)
- JSON comparison ready for scoring model outputs against expected values
- Cost tracker ready for budget enforcement during parallel model runs
- Backoff ready for wrapping API calls with rate limit handling
- Runner ready for calling OpenRouter (mock or real mode)

---
*Phase: 02-pay-and-run*
*Completed: 2026-02-11*
