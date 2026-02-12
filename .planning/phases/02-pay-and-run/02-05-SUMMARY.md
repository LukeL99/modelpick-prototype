---
phase: 02-pay-and-run
plan: 05
subsystem: debug
tags: [react-context, mock-config, env-vars, gap-closure]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Mock config system (DEBUG_MOCK_* env vars, getActiveMocks, MockIndicator)"
provides:
  - "MockProvider context for server-to-client mock state delivery"
  - "useMocks() hook for client components to read active mocks"
  - "Single source of truth for mock configuration (no NEXT_PUBLIC_DEBUG_MOCKS)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-to-client state via React context provider in layout.tsx"

key-files:
  created:
    - "src/lib/debug/mock-provider.tsx"
  modified:
    - "src/lib/debug/mock-config.ts"
    - "src/components/debug/mock-indicator.tsx"
    - "src/components/wizard/confirmation-screen.tsx"
    - "src/app/layout.tsx"
    - ".env.local.example"

key-decisions:
  - "MockProvider as separate 'use client' file to keep mock-config.ts server-only"

patterns-established:
  - "Server-to-client pattern: server component reads env, passes to client context provider"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 2 Plan 5: MockProvider Context Summary

**Replaced redundant NEXT_PUBLIC_DEBUG_MOCKS env var with React context provider that derives mock state from DEBUG_MOCK_* server-side env vars**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T16:08:20Z
- **Completed:** 2026-02-12T16:10:05Z
- **Tasks:** 1
- **Files modified:** 6 (+ 1 created)

## Accomplishments
- Created MockProvider context + useMocks() hook for client-side mock state consumption
- Updated MockIndicator and ConfirmationScreen to use context instead of direct env var reads
- Removed getClientActiveMocks() function and NEXT_PUBLIC_DEBUG_MOCKS from code and env files
- Single source of truth: DEBUG_MOCK_* vars read server-side in layout.tsx, passed via MockProvider

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MockProvider context and update all consumers** - `3aeb361` (feat)

**Plan metadata:** `159bf4d` (docs: complete plan)

## Files Created/Modified
- `src/lib/debug/mock-provider.tsx` - New: MockProvider context component and useMocks() hook
- `src/lib/debug/mock-config.ts` - Removed getClientActiveMocks() function
- `src/components/debug/mock-indicator.tsx` - Switched from getClientActiveMocks() to useMocks()
- `src/components/wizard/confirmation-screen.tsx` - Switched from getClientActiveMocks() to useMocks()
- `src/app/layout.tsx` - Added MockProvider wrapper with getActiveMocks() server call
- `.env.local.example` - Removed NEXT_PUBLIC_DEBUG_MOCKS line, updated comment

## Decisions Made
- MockProvider lives in separate `mock-provider.tsx` file with "use client" directive to keep `mock-config.ts` as a server-only module (no directive conflict)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 gap closure plans complete (02-04, 02-05)
- Phase 2 fully ready for Phase 3
- Mock system now has clean single source of truth

## Self-Check: PASSED

All 7 files verified on disk. Commit `3aeb361` confirmed in git log.

---
*Phase: 02-pay-and-run*
*Completed: 2026-02-12*
