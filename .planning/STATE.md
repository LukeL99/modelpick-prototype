# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Users can see exactly which vision model extracts their specific document data most accurately and cheaply -- with field-level error diffs showing precisely where each model fails.
**Current focus:** Phase 1 - Configure Benchmark

## Current Position

Phase: 1 of 3 (Configure Benchmark)
Plan: 3 of 4 in current phase
Status: Executing
Last activity: 2026-02-11 -- Completed 01-03-PLAN.md

Progress: [██████░░░░] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~6 min
- Total execution time: 0.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-configure-benchmark | 3 | ~18 min | ~6 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~8 min), 01-02 (~3 min), 01-03 (~7 min)
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

### Pending Todos

- User must configure Supabase project and set env vars in .env.local
- User must run database migration in Supabase SQL Editor
- User must create `benchmark-images` storage bucket in Supabase

### Blockers/Concerns

- Next.js 16 warns middleware is deprecated in favor of "proxy" -- informational only, middleware still works.

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 01-03-PLAN.md (wizard Steps 1 & 2)
Resume file: .planning/phases/01-configure-benchmark/01-03-SUMMARY.md
