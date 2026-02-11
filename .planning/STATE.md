# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Users can see exactly which vision model extracts their specific document data most accurately and cheaply -- with field-level error diffs showing precisely where each model fails.
**Current focus:** Phase 1 - Configure Benchmark

## Current Position

Phase: 1 of 3 (Configure Benchmark) -- COMPLETE
Plan: 6 of 6 in current phase (all plans complete, including gap closure)
Status: Phase Complete
Last activity: 2026-02-11 -- Completed 01-06-PLAN.md (gap closure)

Progress: [████████░░] 33%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~5 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-configure-benchmark | 6 | ~30 min | ~5 min |

**Recent Trend:**
- Last 6 plans: 01-01 (~8 min), 01-02 (~3 min), 01-03 (~7 min), 01-04 (~6 min), 01-05 (~5 min), 01-06 (~3 min)
- Trend: Consistent

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Configurable wizard included in v1 (user override of research recommendation to defer)
- [Init]: Auth included in v1 (user override of research recommendation to defer)
- [Init]: Supabase Realtime for progress delivery instead of direct SSE (research recommendation)
- [Init]: Fresh Next.js build, existing repo is prototype reference only
- [01-01]: Supabase middleware gracefully skips when env vars not set (development workflow)
- [01-01]: Tailwind v4 CSS-native @theme with custom dark-warm palette variables
- [01-01]: 25 curated vision models across 5 tiers (free/budget/mid/premium/ultra)
- [01-01]: Separate JSONB columns per wizard step to prevent race conditions
- [01-02]: Fixed middleware route protection to match actual URL paths not route group names
- [01-02]: Social buttons above divider, email/password form below on auth pages
- [01-02]: Sign-out button as separate client component to keep app layout as server component
- [01-03]: @dnd-kit/react move() takes (items, event) not (items, source, target) -- research API mismatch
- [01-03]: Draft query helpers use SupabaseClient<any> to avoid generic mismatch with untyped createClient()
- [01-03]: StepUpload uses imagesRef for async upload callbacks to prevent stale closures
- [01-03]: Upload data strips parsedJson and blob URLs before persisting to database
- [01-04]: lodash installed as transitive dependency required by @jsonhero/json-schema-fns
- [01-04]: @jsonhero/schema-infer inferSchema() API takes (value, previousInference?) not (value, { existing })
- [01-04]: Cost estimator uses 1500 input / 500 output tokens per vision call with 3x parallelism
- [01-04]: Model recommendation filters by strategy tiers then scores by priority weighting (3x/2x/1x)
- [01-04]: PATCH /api/drafts/[id] extended to support status updates for completion flow
- [Phase 01]: ON CONFLICT DO UPDATE SET public=true for idempotent bucket creation ensuring public access
- [Phase 01]: Folder ownership RLS via storage.foldername()[1] matching upload path pattern user.id/draftId/file
- [01-06]: Slot-to-image mapping via array index (images[slotIndex]) for direct slot-to-image correspondence
- [01-06]: Saved state managed locally per ImageCard, initialized from jsonValid on mount for draft restoration
- [01-06]: SlotDropzone kept in image-uploader.tsx with renamed export (same file, different component name)

### Pending Todos

- User must configure Supabase project and set env vars in .env.local
- User must run database migration in Supabase SQL Editor
- User must create `benchmark-images` storage bucket in Supabase

### Blockers/Concerns

- Next.js 16 warns middleware is deprecated in favor of "proxy" -- informational only, middleware still works.

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 01-06-PLAN.md (Phase 1 gap closure complete -- slot-based upload UX)
Resume file: .planning/phases/01-configure-benchmark/01-06-SUMMARY.md
