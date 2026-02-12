# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Users can see exactly which vision model extracts their specific document data most accurately and cheaply -- with field-level error diffs showing precisely where each model fails.
**Current focus:** Phase 2 - Pay and Run (gap closure complete)

## Current Position

Phase: 2 of 3 (Pay and Run) -- COMPLETE (including gap closure)
Plan: 5 of 5 in current phase (all complete, including 2 gap closure plans)
Status: Phase 2 fully complete with gap closures, ready for Phase 3
Last activity: 2026-02-12 -- Completed 02-05 (MockProvider context replacing NEXT_PUBLIC_DEBUG_MOCKS)

Progress: [█████████████████░░] 73%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~5 min
- Total execution time: ~1 hour

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-configure-benchmark | 6 | ~30 min | ~5 min |
| 02-pay-and-run | 5 | ~28 min | ~6 min |
| quick tasks | 1 | ~1 min | ~1 min |

**Recent Trend:**
- Last 6 plans: 02-01 (~16 min), 02-02 (~14 min), 02-03 (~6 min), quick-1 (~1 min), 02-04, 02-05 (~2 min)
- Trend: Phase 2 gap closure complete

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
- [01-05]: ON CONFLICT DO UPDATE SET public=true for idempotent bucket creation ensuring public access
- [01-05]: Folder ownership RLS via storage.foldername()[1] matching upload path pattern user.id/draftId/file
- [01-06]: Slot-to-image mapping via array index (images[slotIndex]) for direct slot-to-image correspondence
- [01-06]: Saved state managed locally per ImageCard, initialized from jsonValid on mount for draft restoration
- [01-06]: SlotDropzone kept in image-uploader.tsx with renamed export (same file, different component name)
- [02-01]: Stripe client uses lazy initialization via getStripe() to prevent build failures without API keys
- [02-01]: Stripe API version 2026-01-28.clover matches installed stripe package type constraints
- [02-01]: Webhook uses @ts-expect-error for engine import since engine.ts is created in Plan 02-03
- [02-02]: CostTracker uses softCeiling as hardCeiling when only one arg provided
- [02-02]: Vitest with node environment and @/ path alias matching tsconfig
- [02-02]: Mock runner seeds random from modelId+imageUrl for deterministic varied results
- [02-03]: Nested concurrency control: global pLimit(10) wrapping per-model pLimit(3) for rate limit protection
- [02-03]: Dynamic import for email module to keep engine loosely coupled from email infrastructure
- [02-03]: Email sender uses RESEND_FROM_EMAIL env var with fallback to Resend onboarding sender for development
- [02-05]: MockProvider as separate "use client" file to keep mock-config.ts server-only

### Pending Todos

- User must configure Supabase project and set env vars in .env.local
- User must run database migration in Supabase SQL Editor
- User must create `benchmark-images` storage bucket in Supabase

### Blockers/Concerns

- Next.js 16 warns middleware is deprecated in favor of "proxy" -- informational only, middleware still works.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Rebrand modelpick to modelblitz (domain: modelblitz.com) | 2026-02-12 | bcf9fb2 | [1-rebrand-modelpick-to-modelblitz-domain-m](./quick/1-rebrand-modelpick-to-modelblitz-domain-m/) |

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 02-05 (MockProvider context replacing NEXT_PUBLIC_DEBUG_MOCKS)
Resume file: .planning/phases/02-pay-and-run/02-05-SUMMARY.md
