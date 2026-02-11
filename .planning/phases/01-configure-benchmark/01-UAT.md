---
status: diagnosed
phase: 01-configure-benchmark
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md
started: 2026-02-11T20:00:00Z
updated: 2026-02-11T20:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Landing Page
expected: Navigating to http://localhost:3000 shows a landing page with ModelPick branding, dark-warm color palette (dark background with ember/orange accents), hero section describing the product, and a "Get Started" call-to-action button.
result: pass

### 2. Auth Pages Layout
expected: Navigating to /auth/login shows a centered card with Google and GitHub social login buttons above a divider, and an email/password form below with a "Magic Link" toggle. Navigating to /auth/signup shows a similar layout with a registration form including password confirmation.
result: pass

### 3. Auth Guard
expected: Visiting /dashboard while not logged in automatically redirects to /auth/login.
result: pass

### 4. Dashboard Empty State
expected: After logging in, /dashboard shows an empty state with "Run your first benchmark" messaging and a call-to-action. The nav bar shows user email, "New Benchmark" button, and sign-out button.
result: pass

### 5. Sign Out
expected: Clicking the sign-out button in the nav logs the user out and redirects to the landing page (/).
result: pass

### 6. Wizard Step 1 — Config
expected: Navigating to /benchmark/new (via "New Benchmark") shows a 3-step indicator (Configure/Upload/Review). Step 1 displays drag-to-rank priorities (reorderable), three strategy preset cards (Quick Survey/Balanced/Deep Dive) that highlight on selection, and a sample count selector with +/- buttons.
result: pass

### 7. Step 2 — Image Upload
expected: After completing Step 1 and clicking Continue, Step 2 shows a drag-and-drop upload zone. Dropping or selecting images (PNG/JPG) displays thumbnail cards with status badges. Each card expands to reveal a CodeMirror JSON editor for entering expected output.
result: issue
reported: "I enabled row level security in supabase. getting message: Failed to upload screen.png: new row violates row-level security policy"
severity: blocker

### 8. Step 2 — JSON Validation & Gate
expected: Entering invalid JSON in the editor shows red underline errors. The Continue button to Step 3 is disabled with a message until every uploaded image has valid JSON entered. Entering valid JSON for all images enables Continue.
result: skipped
reason: Blocked by upload RLS issue (test 7)

### 9. Step 3 — Schema, Prompt & Cost
expected: Step 3 auto-infers a JSON schema from the uploaded examples shown in a read-only CodeMirror editor (with toggle to manual edit mode). An extraction prompt textarea is present. A cost preview card shows estimated cost, number of models, runs, time estimate, and a budget utilization bar. Model chips allow adding/removing models from the selection.
result: skipped
reason: Blocked by upload RLS issue (test 7)

### 10. Wizard Completion
expected: After entering an extraction prompt (20+ characters) and confirming model selection, a "Ready for Payment" button appears. Clicking it completes the wizard and sets the draft status to 'ready'.
result: skipped
reason: Blocked by upload RLS issue (test 7)

## Summary

total: 10
passed: 6
issues: 1
pending: 0
skipped: 3

## Gaps

- truth: "Image upload to Supabase Storage works with RLS enabled"
  status: failed
  reason: "User reported: I enabled row level security in supabase. getting message: Failed to upload screen.png: new row violates row-level security policy"
  severity: blocker
  test: 7
  root_cause: "No RLS policies exist on storage.objects table for benchmark-images bucket. Policies were designed in research phase but left commented out and never added to migration."
  artifacts:
    - path: "supabase/migrations/001_initial_schema.sql"
      issue: "Missing storage.objects RLS policies for benchmark-images bucket"
    - path: "src/app/api/upload/signed-url/route.ts"
      issue: "createSignedUploadUrl fails under RLS without INSERT policy"
    - path: "src/components/wizard/step-upload.tsx"
      issue: "uploadToSignedUrl, getPublicUrl, and remove all fail without policies"
  missing:
    - "INSERT policy on storage.objects for authenticated users (bucket_id = 'benchmark-images', folder ownership via auth.uid())"
    - "SELECT policy on storage.objects for authenticated users (own files)"
    - "DELETE policy on storage.objects for authenticated users (own files)"
    - "UPDATE policy on storage.objects for authenticated users (own files)"
  debug_session: ".planning/debug/rls-upload-blocker.md"
