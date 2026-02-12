# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Users can see exactly which vision model extracts their specific document data most accurately and cheaply -- with field-level error diffs showing precisely where each model fails.
**Current focus:** Phase 3 - Results and Report

## Current Position

Phase: 3 of 3 (Results and Report)
Plan: 3 of 4 in current phase (03-03 complete)
Status: Executing Phase 3
Last activity: 2026-02-12 -- Completed 03-03 (Shareable report page)

Progress: [████████████████████] 94%

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: ~5 min
- Total execution time: ~1 hour 9 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-configure-benchmark | 6 | ~30 min | ~5 min |
| 02-pay-and-run | 6 | ~29 min | ~5 min |
| 03-results-and-report | 3 | ~9 min | ~3 min |
| quick tasks | 1 | ~1 min | ~1 min |

**Recent Trend:**
- Last 6 plans: 02-04, 02-05 (~2 min), 02-06 (~1 min), 03-01 (~3 min), 03-02 (~3 min), 03-03 (~3 min)
- Trend: Phase 3 executing steadily, one plan remaining

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
- [02-04]: setSavedSchemaData called BEFORE saveDraftStep for immediate state sync even if network is slow
- [02-04]: handleComplete conditionally includes step/data for edge case safety when savedSchemaData is null
- [02-04]: Removed intermediate success page entirely rather than hiding it, keeping StepSchema visible during API call
- [02-05]: MockProvider as separate "use client" file to keep mock-config.ts server-only
- [02-06]: Merged onChange + onValidChange into single atomic onChange(value, isValid, parsed) to eliminate stale closure race
- [03-01]: Pure function data layer: all report utilities take data as arguments, no DB calls
- [03-01]: 10% threshold for error pattern filtering to exclude rare one-off errors
- [03-01]: Default REPLICA IDENTITY (primary key) sufficient for Realtime -- no FULL needed
- [03-02]: Track counted run IDs in Set to prevent double-counting on INSERT then UPDATE events
- [03-02]: Subscribe to both benchmark_runs and reports tables on same Realtime channel
- [03-02]: 1.5s delay before redirect so user sees Complete state briefly
- [03-03]: RecommendationCard is a server component; only ShareButton and RankedTable are client components
- [03-03]: Cost displayed with toFixed(4) for sub-cent precision in ranked table

### Pending Todos

- User must configure Supabase project and set env vars in .env.local
- User must run database migrations (001-004) in Supabase SQL Editor
- User must create `benchmark-images` storage bucket in Supabase

### Blockers/Concerns

- Next.js 16 warns middleware is deprecated in favor of "proxy" -- informational only, middleware still works.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Rebrand modelpick to modelblitz (domain: modelblitz.com) | 2026-02-12 | bcf9fb2 | [1-rebrand-modelpick-to-modelblitz-domain-m](./quick/1-rebrand-modelpick-to-modelblitz-domain-m/) |

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 03-03 (Shareable report page)
Resume file: .planning/phases/03-results-and-report/03-03-SUMMARY.md
