---
status: diagnosed
phase: 02-pay-and-run
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md
started: 2026-02-12T18:00:00Z
updated: 2026-02-12T19:15:00Z
round: 2
prior_round: "Round 1 found 3 issues (confirmation screen data loss, mock payment 400, mock indicator env var). Fixed by plans 02-04, 02-05."
---

## Current Test

[testing complete]

## Tests

### 1. Confirmation Screen (no flash, correct data)
expected: After completing wizard Step 3, confirmation screen appears immediately (no flash page). Shows correct model count matching selection, image count, estimated cost, and Pay $14.99 button.
result: pass

### 2. Back-to-Edit Preserves Data
expected: From confirmation screen, clicking back to edit returns to wizard. The prompt in Schema step is preserved. Going back to Upload step and clicking edit on expected_output.json shows the previously entered JSON data.
result: issue
reported: "The JSON data for an image still isn't there. The prompt is correct"
severity: major

### 3. Mock Payment Flow
expected: With DEBUG_MOCK_STRIPE=true, clicking the Pay button on the confirmation screen creates a report immediately (no Stripe redirect) and redirects to the processing page.
result: pass

### 4. Processing Page
expected: The processing page (/benchmark/[id]/processing) displays a spinner/loading state and benchmark summary (models, images, runs).
result: pass

### 5. Mock Indicator Badge
expected: With DEBUG_MOCK_STRIPE=true, DEBUG_MOCK_OPENROUTER=true, DEBUG_MOCK_EMAIL=true set in .env.local, a fixed-position badge appears showing individual mock names derived from these server-side env vars. No NEXT_PUBLIC_DEBUG_MOCKS env var needed.
result: pass

### 6. Checkout Cancel Page
expected: Visiting /checkout/cancel shows a cancellation message and a button to retry or return to the benchmark.
result: pass

### 7. Unit Tests Pass
expected: Running `npm test` executes all benchmark engine tests (json-compare, backoff, cost-tracker) and all pass.
result: pass

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Going back to Upload step and clicking edit on expected_output.json shows the previously entered JSON data"
  status: failed
  reason: "User reported: The JSON data for an image still isn't there. The prompt is correct"
  severity: major
  test: 2
  root_cause: "Stale closure race in step-upload.tsx: handleJsonChange and handleValidChange both close over same images array and call onImagesChange synchronously from JsonEditor.handleChange. React 18 batching causes second call (handleValidChange) to overwrite first (handleJsonChange), discarding expectedJson update."
  artifacts:
    - path: "src/components/wizard/step-upload.tsx"
      issue: "Two separate callbacks (handleJsonChange L142-151, handleValidChange L153-164) do partial updates to same image object, creating last-writer-wins race"
    - path: "src/components/wizard/json-editor.tsx"
      issue: "handleChange (L59-78) calls both onChange and onValidChange synchronously triggering the race"
    - path: "src/app/(app)/benchmark/new/page.tsx"
      issue: "handleImagesChange calls setImages which is called twice with stale data"
  missing:
    - "Merge handleJsonChange and handleValidChange into single atomic callback that sets expectedJson, jsonValid, and parsedJson in one onImagesChange call"
  debug_session: ".planning/debug/json-data-lost-on-back-nav.md"
