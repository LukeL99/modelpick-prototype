---
phase: 01-configure-benchmark
plan: 06
subsystem: ui
tags: [wizard, react-dropzone, upload-slots, image-card, three-state-lifecycle, slot-based-upload]

# Dependency graph
requires:
  - phase: 01-03
    provides: "Wizard shell, Step 2 upload components, ImageUploader, ImageCard, JsonEditor, draft persistence"
provides:
  - "Slot-based Step 2 upload: exactly N cards matching sampleCount from Step 1"
  - "SlotDropzone: single-file embedded dropzone replacing shared multi-file dropzone"
  - "Three-state ImageCard lifecycle: empty (dropzone), editing (thumbnail + JSON + Save), saved (compact row)"
  - "Thumbnail click toggles inline full-size preview in editing and saved states"
  - "Draft restoration correctly initializes saved state for images with valid JSON"
affects: [02-execute-benchmark]

# Tech tracking
tech-stack:
  added: []
  patterns: [slot-based-upload-grid, three-state-card-lifecycle, inline-image-preview-toggle]

key-files:
  created: []
  modified:
    - src/components/wizard/step-upload.tsx
    - src/components/wizard/image-uploader.tsx
    - src/components/wizard/image-card.tsx

key-decisions:
  - "Slot-to-image mapping via array index: images[slotIndex] directly maps to slot N"
  - "Saved state managed locally in each ImageCard, initialized from jsonValid on mount for draft restoration"
  - "SlotDropzone is a separate export from image-uploader.tsx (same file, renamed component)"

patterns-established:
  - "Slot-based upload: Array.from({ length: sampleCount }) generates N card slots"
  - "Three-state card lifecycle: empty -> editing -> saved, derived from image prop + local saved state"
  - "Inline preview toggle: thumbnail click shows/hides full-size image within card, no modal"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 1 Plan 6: Slot-based Upload UX Summary

**N structured card slots matching sampleCount with three-state lifecycle (empty dropzone, editing with JSON editor and Save, compact saved row) replacing the free-form shared dropzone**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-11T21:14:41Z
- **Completed:** 2026-02-11T21:17:25Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Restructured Step 2 from shared multi-file dropzone to N pre-initialized card slots driven by sampleCount
- Converted ImageUploader to SlotDropzone: single-file embedded dropzone per card slot with `multiple: false`
- Implemented three-state ImageCard: empty (embedded SlotDropzone), editing (48x48 thumbnail + JSON editor + Save button), saved (compact row with green border and Edit button)
- Thumbnail click toggles inline full-size preview in both editing and saved states
- Draft restoration correctly initializes saved=true for images with valid JSON on mount
- Progress bar now shows savedCount/sampleCount instead of validCount/totalCount

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure StepUpload to slot-based layout and rewrite ImageUploader as SlotDropzone** - `37e2fcb` (feat)
2. **Task 2: Implement three-state ImageCard lifecycle (empty, editing, saved)** - `4fdffab` (feat)

## Files Created/Modified
- `src/components/wizard/step-upload.tsx` - Slot-based layout with N cards, handleFileForSlot upload, progress shows savedCount/sampleCount
- `src/components/wizard/image-uploader.tsx` - Renamed to SlotDropzone, single-file dropzone with compact p-6 styling
- `src/components/wizard/image-card.tsx` - Three-state lifecycle (empty/editing/saved), inline preview toggle, Save/Edit buttons

## Decisions Made
- Slot-to-image mapping uses simple array index (images[slotIndex]) rather than an explicit slot ID -- straightforward since slots are sequential
- Saved state managed locally per-card via useState, initialized from jsonValid for draft restoration
- SlotDropzone kept in same file (image-uploader.tsx) with renamed export, since the file is the natural home for dropzone logic

## Deviations from Plan

None - plan executed exactly as written.

Note: Tasks 1 and 2 were developed together since Task 1's TypeScript verification depends on the ImageCard props change from Task 2 (step-upload.tsx passes new props like slotIndex and onFileAccepted that only exist after Task 2's interface update). Both tasks were committed separately but verified together.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Step 2 upload UX now matches the intended slot-based card architecture
- All N slots render with correct lifecycle, ready for UAT verification
- Phase 01 gap closure complete -- all 6 plans finished

## Self-Check: PASSED

All 3 modified files verified present. Both task commits (37e2fcb, 4fdffab) verified in git log.

---
*Phase: 01-configure-benchmark*
*Completed: 2026-02-11*
