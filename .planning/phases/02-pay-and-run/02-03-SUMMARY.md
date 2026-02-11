---
phase: 02-pay-and-run
plan: 03
subsystem: benchmark-engine
tags: [p-limit, concurrency, orchestration, resend, react-email, cost-tracking, model-recommendation]

# Dependency graph
requires:
  - phase: 02-pay-and-run
    provides: "Stripe webhook handler, benchmark_runs table, admin client, cost tracker, runner, JSON comparison, backoff"
provides:
  - "runBenchmark() orchestration loop with concurrency control and cost ceiling enforcement"
  - "Report completion email via Resend with React Email template"
  - "Priority-weighted model recommendation scoring from benchmark results"
  - "Aggregate result calculation (accuracy, exactMatchRate, costPerCall, latency, spread)"
affects: [03-results-and-share]

# Tech tracking
tech-stack:
  added: [p-limit, resend, "@react-email/components"]
  patterns: [concurrency-limiter-nesting, priority-weighted-scoring, non-fatal-email, dynamic-import-email]

key-files:
  created:
    - src/lib/benchmark/engine.ts
    - src/lib/email/send-report-ready.ts
    - src/emails/report-ready.tsx
  modified:
    - src/app/api/webhooks/stripe/route.ts
    - package.json

key-decisions:
  - "Nested concurrency control: global pLimit(10) wrapping per-model pLimit(3) for rate limit protection"
  - "Dynamic import for email module to keep engine loosely coupled from email infrastructure"
  - "Email sender uses RESEND_FROM_EMAIL env var with fallback to Resend onboarding sender for development"

patterns-established:
  - "Nested p-limit: globalLimit(() => modelLimit(() => fn())) for hierarchical concurrency control"
  - "Non-fatal email: email sends wrapped in try/catch, failure logged but never affects benchmark results"
  - "Priority-weighted scoring: position 0 = 3x weight, position 1 = 2x, position 2 = 1x for model ranking"

# Metrics
duration: 6min
completed: 2026-02-11
---

# Phase 02 Plan 03: Benchmark Engine and Report Email Summary

**Benchmark orchestration loop with nested p-limit concurrency (3 per-model, 10 global), dual cost ceiling enforcement ($7/$15), graceful 750s shutdown, priority-weighted model recommendation, and Resend email notification with React Email dark-theme template**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-11T23:20:10Z
- **Completed:** 2026-02-11T23:26:04Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Benchmark engine orchestrates all model+image+run combinations with nested concurrency control via p-limit
- Cost ceiling enforcement: $7 soft ceiling for budget reservations, $15 hard ceiling for emergency abort
- Graceful shutdown at 750s elapsed time, marking remaining runs as skipped
- Aggregate results calculated per model: accuracy, exactMatchRate, costPerCall, medianLatency, p95Latency, spread
- Priority-weighted scoring determines recommended model using user's ranked priorities (3x/2x/1x weighting)
- React Email template with dark theme, ember-orange CTA button, and model recommendation highlight
- Email sent via Resend with mock mode support (DEBUG_MOCK_EMAIL=true)

## Task Commits

Each task was committed atomically:

1. **Task 1: Benchmark engine orchestration loop with concurrency control, cost ceiling, and graceful shutdown** - `c4e0ab9` (feat)
2. **Task 2: Report completion email via Resend with React Email template** - `c782a10` (feat)

## Files Created/Modified
- `src/lib/benchmark/engine.ts` - Main benchmark orchestration loop: runBenchmark() with concurrency, cost tracking, aggregate calculation, model recommendation
- `src/lib/email/send-report-ready.ts` - Resend email sender with mock mode, non-fatal error handling
- `src/emails/report-ready.tsx` - React Email template: dark theme, model count, recommendation highlight, CTA button
- `src/app/api/webhooks/stripe/route.ts` - Removed @ts-expect-error annotation (engine.ts now exists)
- `package.json` - Added p-limit, resend, @react-email/components dependencies

## Decisions Made
- Nested concurrency control: `globalLimit(() => modelLimit(() => executeRun(item)))` provides both per-model rate limit protection (3 concurrent) and global resource management (10 concurrent)
- Dynamic import for email module: `await import("@/lib/email/send-report-ready")` keeps the engine loosely coupled and allows the email module to fail independently
- Email sender uses `RESEND_FROM_EMAIL` env var with fallback to `onboarding@resend.dev` for development without custom domain
- Stub email sender created first in Task 1 for build compatibility, then replaced with full implementation in Task 2

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reinstalled stripe dependency**
- **Found during:** Task 1 (npm install p-limit)
- **Issue:** `npm install p-limit` removed stripe from node_modules because it wasn't in package.json (was installed manually in prior plan but not saved)
- **Fix:** Ran `npm install stripe` to add it as an explicit dependency
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx tsc --noEmit` passes, build succeeds
- **Committed in:** c4e0ab9 (Task 1 commit)

**2. [Rule 3 - Blocking] Created stub email sender for Task 1 build compatibility**
- **Found during:** Task 1 (engine references email module that doesn't exist yet)
- **Issue:** Engine's dynamic import of `@/lib/email/send-report-ready` fails tsc and Next.js build because the module doesn't exist until Task 2
- **Fix:** Created a minimal stub email sender that logs instead of sending, allowing engine to compile; replaced with full implementation in Task 2
- **Files modified:** src/lib/email/send-report-ready.ts
- **Verification:** `npm run build` succeeds with stub, then with full implementation
- **Committed in:** c4e0ab9 (Task 1 commit, stub), c782a10 (Task 2 commit, full implementation)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for build. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations.

## User Setup Required

**For real email sending:**
- Set `RESEND_API_KEY` (from Resend Dashboard -> API Keys)
- Optionally set `RESEND_FROM_EMAIL` (e.g., `ModelPick <noreply@yourdomain.com>`) for custom sender domain
- Without `RESEND_API_KEY`, emails are silently skipped (not an error)

**For development:**
- Set `DEBUG_MOCK_EMAIL=true` to log emails instead of sending
- Set `DEBUG_MOCK_OPENROUTER=true` for mock API calls (no real OpenRouter key needed)

## Next Phase Readiness
- Complete benchmark pipeline: payment -> webhook -> engine -> results -> email
- Mock mode works end-to-end without any external API keys
- Aggregate results per model ready for Phase 3 report display
- Report share_token ready for public report URLs
- All 50 existing tests still pass

## Self-Check: PASSED

All 5 created/modified files verified on disk. Both task commits (c4e0ab9, c782a10) verified in git history.

---
*Phase: 02-pay-and-run*
*Completed: 2026-02-11*
