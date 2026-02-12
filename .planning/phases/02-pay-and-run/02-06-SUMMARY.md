---
phase: 02-pay-and-run
plan: 06
subsystem: ui
tags: [react, state-management, race-condition, json-editor, callbacks]

# Dependency graph
requires:
  - phase: 01-configure-benchmark
    provides: JsonEditor, ImageCard, StepUpload wizard components
provides:
  - Atomic single-callback JSON update flow eliminating stale closure race
  - Combined onChange(value, isValid, parsed) signature in JsonEditor
  - Single onJsonUpdate prop in ImageCard replacing dual onJsonChange + onValidChange
  - Atomic handleJsonUpdate in StepUpload producing one onImagesChange call per keystroke
affects: [wizard, upload-step, json-editing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single atomic callback for multi-field state updates to prevent React 18 batching races"

key-files:
  created: []
  modified:
    - src/components/wizard/json-editor.tsx
    - src/components/wizard/image-card.tsx
    - src/components/wizard/step-upload.tsx

key-decisions:
  - "Merged onChange + onValidChange into single onChange(value, isValid, parsed) to eliminate dual-callback race"

patterns-established:
  - "Atomic callback pattern: when multiple fields must update together, use a single callback with all values rather than separate callbacks that close over shared state"

# Metrics
duration: 1min
completed: 2026-02-12
---

# Phase 2 Plan 6: Gap Closure - Stale Closure Race Fix Summary

**Single atomic onChange(value, isValid, parsed) callback replacing dual onChange + onValidChange to eliminate React 18 batching race that silently discarded expectedJson**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-12T16:59:29Z
- **Completed:** 2026-02-12T17:00:53Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Eliminated stale closure race where React 18 batched two separate setImages calls and last-writer-wins discarded expectedJson
- Merged two-callback pattern (onChange + onValidChange) into single atomic onChange(value, isValid, parsed) throughout the chain
- All 50 existing tests pass, TypeScript compiles cleanly, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Merge onChange + onValidChange into single atomic callback** - `8039953` (fix)

## Files Created/Modified
- `src/components/wizard/json-editor.tsx` - Combined onChange + onValidChange into single onChange(value, isValid, parsed); removed onValidChange from props
- `src/components/wizard/image-card.tsx` - Replaced onJsonChange + onValidChange props with single onJsonUpdate prop; passes it directly to JsonEditor onChange
- `src/components/wizard/step-upload.tsx` - Replaced handleJsonChange + handleValidChange with single handleJsonUpdate that atomically sets expectedJson, jsonValid, and parsedJson in one onImagesChange call

## Decisions Made
- Merged onChange + onValidChange into single onChange(value, isValid, parsed) to structurally eliminate the race condition rather than working around it with refs or useReducer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 gap closure is fully complete (all 6 plans done)
- UAT Test 2 (Back-to-Edit Preserves Data) should now pass: JSON data is preserved through the full navigation cycle
- Ready for Phase 3

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 02-pay-and-run*
*Completed: 2026-02-12*
