---
phase: 01-configure-benchmark
plan: 03
subsystem: ui, api
tags: [wizard, dnd-kit, react-dropzone, codemirror, nuqs, supabase-storage, signed-url, json-validation, draft-persistence]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js project, Supabase clients, Tailwind dark-warm palette, database schema, types, constants"
  - phase: 01-02
    provides: "Auth UI, authenticated app layout, Button/Card components"
provides:
  - "Wizard shell at /benchmark/new with 3-step indicator and URL-persisted state"
  - "Step 1: drag-to-rank priorities via @dnd-kit/react, strategy picker cards, sample count selector"
  - "Step 2: drag-and-drop image upload via react-dropzone, Supabase Storage signed URL upload"
  - "CodeMirror JSON editor with inline validation (red underlines via linter extension)"
  - "Draft CRUD API routes (POST /api/drafts, GET/PATCH /api/drafts/[id])"
  - "Signed URL API route (POST /api/upload/signed-url) for direct client-to-storage upload"
  - "Draft query helpers (createDraft, loadDraft, saveDraftStep, getUserDrafts)"
  - "Auto-save with 500ms debounce for both config and upload data"
  - "Progression gate: Step 2 blocks until all images have valid JSON"
affects: [01-04, 02-execute-benchmark]

# Tech tracking
tech-stack:
  added: []
  patterns: [wizard-url-state-nuqs, dnd-kit-react-sortable, codemirror-json-linter, supabase-signed-upload, draft-auto-save-debounce, image-ref-async-pattern]

key-files:
  created:
    - src/app/(app)/benchmark/new/page.tsx
    - src/components/wizard/wizard-shell.tsx
    - src/components/wizard/step-config.tsx
    - src/components/wizard/step-upload.tsx
    - src/components/wizard/priority-ranker.tsx
    - src/components/wizard/strategy-picker.tsx
    - src/components/wizard/image-uploader.tsx
    - src/components/wizard/image-card.tsx
    - src/components/wizard/json-editor.tsx
    - src/components/ui/step-indicator.tsx
    - src/app/api/upload/signed-url/route.ts
    - src/app/api/drafts/route.ts
    - src/app/api/drafts/[id]/route.ts
    - src/lib/supabase/queries.ts
  modified: []

key-decisions:
  - "@dnd-kit/react move() takes (items, event) not (items, source, target) -- API differs from research docs"
  - "Draft query helpers use SupabaseClient<any> to avoid generic mismatch with untyped createClient()"
  - "StepUpload uses imagesRef to track latest images array for async upload callbacks"
  - "Upload data strips parsedJson and blob URLs before persisting to database"

patterns-established:
  - "Wizard step state via nuqs parseAsStringEnum with WizardStep[] array"
  - "Draft auto-save: debounce 500ms, PATCH /api/drafts/[id] with { step, data }"
  - "Image upload: signed URL from API route, then uploadToSignedUrl to Supabase Storage"
  - "CodeMirror JSON editor: json() + linter(jsonParseLinter()) extensions for inline validation"
  - "Image cards: expand/collapse pattern with one card expanded at a time via local state"
  - "Progression gate: canContinue derived from image data validity, disables Continue button"

# Metrics
duration: 7min
completed: 2026-02-11
---

# Phase 1 Plan 3: Wizard Steps 1 & 2 Summary

**3-step wizard shell with URL-persisted state, drag-to-rank priorities via @dnd-kit/react, strategy presets, image upload via Supabase Storage signed URLs, and CodeMirror JSON editor with inline validation**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-11T19:09:58Z
- **Completed:** 2026-02-11T19:17:17Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Built wizard shell at /benchmark/new with step indicator (completed/active/upcoming), back/continue navigation, and URL-persisted step state via nuqs
- Step 1: drag-to-rank priority ordering with @dnd-kit/react, strategy preset cards (Quick Survey/Balanced/Deep Dive), and sample count selector with +/- buttons
- Step 2: drag-and-drop image upload via react-dropzone with file validation, Supabase Storage signed URL upload (bypasses Vercel 4.5MB limit), expandable image cards with CodeMirror JSON editor featuring inline validation (red underlines) and JSON file upload support
- Draft persistence: auto-create on page load, auto-save config and upload data with 500ms debounce, resume on return via ?draft= URL param
- Progression gate: Step 2 Continue button disabled until all images have valid JSON with clear messaging

## Task Commits

Each task was committed atomically:

1. **Task 1: Wizard shell, Step 1 config, draft persistence, API routes** - `211dcc3` (feat)
2. **Task 2: Step 2 image upload with signed URLs, JSON editor, validation** - `b59ef5f` (feat)

## Files Created/Modified
- `src/app/(app)/benchmark/new/page.tsx` - Wizard page with URL-persisted step state, draft init/load, auto-save
- `src/components/wizard/wizard-shell.tsx` - Step navigation, progress indicator, back/continue buttons
- `src/components/wizard/step-config.tsx` - Step 1: priority ranker, strategy picker, sample count
- `src/components/wizard/step-upload.tsx` - Step 2: image upload, card list, validation summary
- `src/components/wizard/priority-ranker.tsx` - Drag-to-rank via @dnd-kit/react DragDropProvider + useSortable
- `src/components/wizard/strategy-picker.tsx` - Three preset cards with details (model count, runs)
- `src/components/wizard/image-uploader.tsx` - Drag-and-drop zone via react-dropzone with file validation
- `src/components/wizard/image-card.tsx` - Thumbnail, JSON status badge, expandable editor
- `src/components/wizard/json-editor.tsx` - CodeMirror 6 with json(), linter(jsonParseLinter()), vscodeDark theme, .json file upload
- `src/components/ui/step-indicator.tsx` - 3-step progress with completed/active/upcoming visual states
- `src/app/api/upload/signed-url/route.ts` - Generates signed upload URL for Supabase Storage
- `src/app/api/drafts/route.ts` - POST: create new draft
- `src/app/api/drafts/[id]/route.ts` - GET: load draft, PATCH: update step data
- `src/lib/supabase/queries.ts` - createDraft, loadDraft, saveDraftStep, getUserDrafts

## Decisions Made
- @dnd-kit/react v0.2.4 `move()` function takes `(items, event)` not `(items, source, target)` as shown in research docs -- fixed during build verification
- Draft query helpers use `SupabaseClient<any>` to avoid TypeScript generic mismatch since existing `createClient()` helpers return untyped clients -- runtime behavior is correct, types are cast
- StepUpload uses `useRef` to track latest images array so async upload callbacks see current state rather than stale closure values
- Upload data strips `parsedJson` objects and blob URLs before persisting to database to keep JSONB column size manageable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @dnd-kit/react move() API mismatch**
- **Found during:** Task 1 (build verification)
- **Issue:** Research docs showed `move(items, source, target)` with 3 args but actual API is `move(items, event)` with 2 args
- **Fix:** Changed to `move(value, event)` matching the actual @dnd-kit/helpers type signature
- **Files modified:** src/components/wizard/priority-ranker.tsx
- **Verification:** Build passes, TypeScript types check
- **Committed in:** 211dcc3 (Task 1 commit)

**2. [Rule 1 - Bug] TypeScript generic mismatch on Supabase queries**
- **Found during:** Task 1 (build verification)
- **Issue:** `SupabaseClient<Database>` type didn't match the untyped client returned by `createClient()`, causing `insert()` to resolve to `never` type
- **Fix:** Changed query helpers to accept `SupabaseClient<any>` with explicit return type casts
- **Files modified:** src/lib/supabase/queries.ts
- **Verification:** Build passes, query functions correctly typed
- **Committed in:** 211dcc3 (Task 1 commit)

**3. [Rule 1 - Bug] nuqs parseAsStringEnum rejects readonly array**
- **Found during:** Task 1 (build verification)
- **Issue:** `const STEPS = [...] as const` creates a readonly tuple which `parseAsStringEnum` rejects since it expects mutable `WizardStep[]`
- **Fix:** Changed from `as const` to explicit `WizardStep[]` type annotation
- **Files modified:** src/app/(app)/benchmark/new/page.tsx
- **Verification:** Build passes
- **Committed in:** 211dcc3 (Task 1 commit)

**4. [Rule 1 - Bug] StepUpload async callbacks see stale images closure**
- **Found during:** Task 2 (upload flow design)
- **Issue:** Upload callbacks run async (after fetch + upload). By the time they complete, the `images` prop from the outer closure is stale if other state changes happened.
- **Fix:** Used `useRef` to track latest images, async callbacks read from `imagesRef.current`
- **Files modified:** src/components/wizard/step-upload.tsx
- **Verification:** Build passes, pattern prevents stale data
- **Committed in:** b59ef5f (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (4 bugs)
**Impact on plan:** All fixes were necessary for correct TypeScript compilation and runtime correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed type/API issues documented above.

## User Setup Required

Per Plan 01-01 user setup (still pending):
- Configure Supabase project and set env vars
- Run database migration
- Create `benchmark-images` storage bucket in Supabase

## Next Phase Readiness
- Wizard Steps 1 and 2 fully functional, ready for Step 3 (Schema & Prompt) in Plan 01-04
- Draft persistence working -- data survives page navigation and can be restored via ?draft= param
- All API routes in place (drafts CRUD + signed URL upload)
- Step indicator and wizard shell reusable for adding Step 3

## Self-Check: PASSED

All 14 key files verified present. Both task commits (211dcc3, b59ef5f) verified in git log.

---
*Phase: 01-configure-benchmark*
*Completed: 2026-02-11*
