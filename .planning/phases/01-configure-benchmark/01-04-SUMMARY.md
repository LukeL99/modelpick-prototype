---
phase: 01-configure-benchmark
plan: 04
subsystem: ui, logic
tags: [wizard, schema-inference, cost-estimation, model-recommendation, codemirror, json-schema, business-logic]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js project, Supabase clients, Tailwind dark-warm palette, database schema, types, constants, curated 25-model lineup"
  - phase: 01-02
    provides: "Auth UI, authenticated app layout, Button/Card components"
  - phase: 01-03
    provides: "Wizard shell, Steps 1 & 2, draft persistence, API routes, JSON editor, image upload"
provides:
  - "Schema inference from examples via @jsonhero/schema-infer"
  - "Schema compatibility checking with field-level and type-level warnings"
  - "Strategy presets with concrete model count and runs-per-model ranges"
  - "Cost estimation with $7 budget ceiling awareness and confidence levels"
  - "Model recommendation with priority-weighted scoring and budget optimization"
  - "Step 3 UI: schema review with auto/manual mode, extraction prompt, compatibility warnings"
  - "Cost preview card with dynamic estimates, budget bar, confidence badge"
  - "Model override with add/remove chips and dropdown selector"
  - "Complete wizard flow ending at 'ready for payment' state"
affects: [02-execute-benchmark, 03-report]

# Tech tracking
tech-stack:
  added: [lodash]
  patterns: [schema-inference-merge, priority-weighted-scoring, cost-estimation-budget-cap, model-recommendation-with-strategy-tiers]

key-files:
  created:
    - src/lib/schema/infer.ts
    - src/lib/schema/validate.ts
    - src/lib/wizard/presets.ts
    - src/lib/wizard/cost-estimator.ts
    - src/lib/wizard/model-recommender.ts
    - src/components/wizard/step-schema.tsx
    - src/components/wizard/schema-review.tsx
    - src/components/wizard/cost-preview.tsx
    - src/components/wizard/model-override.tsx
  modified:
    - src/app/(app)/benchmark/new/page.tsx
    - src/app/api/drafts/[id]/route.ts
    - package.json

key-decisions:
  - "lodash installed as transitive dependency required by @jsonhero/json-schema-fns (used by schema-infer)"
  - "@jsonhero/schema-infer inferSchema() API takes (value, previousInference?) not (value, { existing })"
  - "Cost estimator uses conservative token estimates: 1500 input, 500 output per vision call"
  - "Model recommendation filters by tier per strategy then scores by priority weighting (3x/2x/1x)"
  - "PATCH /api/drafts/[id] extended to support status updates for completion flow"

patterns-established:
  - "Schema inference: inferSchema(value, previousInference) iteratively merges multiple examples"
  - "Cost estimation: per-model cost = (inputTokens * price/1M) + (outputTokens * price/1M) with budget cap"
  - "Model recommendation: filter by strategy tiers, score by priority weights, optimize runs within budget"
  - "Wizard completion: StepSchema validates prompt (20+ chars) + schema + models, then sets draft status to 'ready'"
  - "Schema review: auto mode (read-only CodeMirror) vs manual mode (editable with linter) with toggle"

# Metrics
duration: 6min
completed: 2026-02-11
---

# Phase 1 Plan 4: Schema Inference, Business Logic, and Wizard Completion Summary

**Schema inference from examples, priority-weighted model recommendation, cost estimation with $7 budget cap, and complete wizard Step 3 with extraction prompt, schema review, cost preview, and model override ending at "ready for payment" state**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-11T19:20:48Z
- **Completed:** 2026-02-11T19:26:49Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Built 5 pure business logic modules: schema inference, schema compatibility checking, strategy presets, cost estimation, and model recommendation
- Schema inference merges multiple JSON examples into a unified JSON Schema using @jsonhero/schema-infer
- Cost estimator calculates per-model and total costs with budget ceiling awareness ($7), confidence levels, and time estimates
- Model recommender uses priority-weighted scoring (3x/2x/1x) with strategy-based tier filtering and budget optimization
- Step 3 UI with extraction prompt textarea, auto-detected schema review with manual override, compatibility warnings, cost preview card, and model add/remove chips
- Complete end-to-end wizard flow: Step 1 (config) -> Step 2 (upload) -> Step 3 (schema/prompt/cost/models) -> "Ready for Payment" state
- Draft persistence extended to save schema data and update status to 'ready' on completion

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema inference, compatibility checking, and business logic** - `68cbe2b` (feat)
2. **Task 2: Step 3 UI, cost preview, model override, and wizard completion flow** - `b14e55c` (feat)

## Files Created/Modified
- `src/lib/schema/infer.ts` - JSON Schema inference from examples via @jsonhero/schema-infer with merge support
- `src/lib/schema/validate.ts` - Schema compatibility checking (field mismatches, type inconsistencies, union type detection)
- `src/lib/wizard/presets.ts` - Strategy preset definitions with concrete model count and runs-per-model ranges
- `src/lib/wizard/cost-estimator.ts` - Cost estimation with budget cap, confidence levels, time estimates, per-model breakdown
- `src/lib/wizard/model-recommender.ts` - Priority-weighted model recommendation with strategy tier filtering and budget optimization
- `src/components/wizard/step-schema.tsx` - Step 3: extraction prompt, schema review, cost preview, model selection, "Ready for Payment" CTA
- `src/components/wizard/schema-review.tsx` - Auto/manual schema mode toggle with CodeMirror editor and compatibility warnings
- `src/components/wizard/cost-preview.tsx` - Cost summary card with models, runs, time, confidence, budget utilization bar
- `src/components/wizard/model-override.tsx` - Add/remove model chips with tier badges, provider colors, and dropdown selector
- `src/app/(app)/benchmark/new/page.tsx` - Updated wizard page to integrate Step 3 with schema data persistence and completion handling
- `src/app/api/drafts/[id]/route.ts` - Extended PATCH to support status updates and computed field persistence
- `package.json` - Added lodash dependency

## Decisions Made
- Installed `lodash` as a runtime dependency because `@jsonhero/json-schema-fns` (transitive dep of `@jsonhero/schema-infer`) requires `lodash/omit` at runtime. Without it, the build fails with "Module not found: Can't resolve 'lodash/omit'".
- The `@jsonhero/schema-infer` API is `inferSchema(value, previousInference?)` where the second arg is a SchemaInferrer instance, not `{ existing: inference }` as research suggested. Fixed during implementation.
- Cost estimator uses conservative token estimates (1500 input, 500 output per vision call) and 3x parallelism factor for time estimates.
- Model recommendation scores models by tier-based metrics weighted by priority rank (3x for #1, 2x for #2, 1x for #3), then optimizes runs-per-model within $7 budget.
- PATCH API route extended to accept optional `status` field to support the "ready for payment" completion flow without needing a separate endpoint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing lodash transitive dependency**
- **Found during:** Task 2 (build verification)
- **Issue:** `@jsonhero/json-schema-fns` (dep of `@jsonhero/schema-infer`) requires `lodash/omit` at runtime but lodash was not in package.json dependencies
- **Fix:** Installed `lodash` as a runtime dependency
- **Files modified:** package.json, package-lock.json
- **Verification:** Build passes after installation
- **Committed in:** b14e55c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for build to succeed. No scope creep.

## Issues Encountered
None beyond the lodash dependency issue documented above.

## User Setup Required

Per Plan 01-01 user setup (still pending):
- Configure Supabase project and set env vars in .env.local
- Run database migration in Supabase SQL Editor
- Create `benchmark-images` storage bucket in Supabase

## Next Phase Readiness
- Phase 1 (Configure Benchmark) is fully complete
- All 3 wizard steps functional: config, upload, schema/prompt
- Draft persistence works for all steps including schema data
- Business logic ready for Phase 2: cost estimator and model recommender can be used by the benchmark execution engine
- Draft status transitions from 'draft' to 'ready' -- Phase 2 can pick up drafts with status='ready' for payment and execution
- Schema inference and compatibility checking generate data structures that Phase 2 benchmark engine will consume

## Self-Check: PASSED

All 9 key files verified present. Both task commits (68cbe2b, b14e55c) verified in git log. Build passes with zero errors.

---
*Phase: 01-configure-benchmark*
*Completed: 2026-02-11*
