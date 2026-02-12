---
status: diagnosed
phase: 02-pay-and-run
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md
started: 2026-02-12T12:00:00Z
updated: 2026-02-12T12:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Confirmation Screen
expected: After completing wizard Step 3, the confirmation screen appears showing benchmark summary (model count, image count, estimated cost) and a "Pay $14.99" button.
result: issue
reported: "there's a very fast 'benchmark configured' page that pops up for 1 second before forwarding you. It should just take you to the confirmation screen. When you click back to edit from the confirmation screen it loses the prompt in the 'Schema and Prompt' phase. If I go back to the 'Upload Phase' and click edit on the expected_output.json that data is blank (should show the json I input in the initial runthrough). also the confirmation screen say '0 models' when I had 15 selected."
severity: major

### 2. Mock Payment Flow
expected: With DEBUG_MOCK_STRIPE=true, clicking the Pay button creates a report immediately (no Stripe redirect) and redirects to the processing page.
result: issue
reported: "getting an error message - 'Something went wrong. Please try again.' In developer tools: :3000/api/checkout:1 Failed to load resource: the server responded with a status of 400 (Bad Request) {\"error\":\"No valid models selected\"}"
severity: major

### 3. Processing Page
expected: The processing page (/benchmark/[id]/processing) displays a spinner and benchmark summary (models, images, runs) while the engine runs.
result: skipped
reason: Can't test - mock payment flow blocked (Test 2)

### 4. Checkout Cancel Page
expected: If payment is cancelled (visiting /checkout/cancel), the page shows a message and a button to retry/return to the benchmark.
result: pass

### 5. Mock Indicator Badge
expected: When mock env vars are active (NEXT_PUBLIC_DEBUG_MOCKS=stripe,openrouter), a small fixed-position badge appears showing which services are mocked.
result: issue
reported: "pass, but having this duplicated is very confusing. The badge should read DEBUG_MOCK_STRIPE DEBUG_MOCK_OPENROUTER DEBUG_MOCK_EMAIL and build the badge from them, not have a different environment variable"
severity: minor

### 6. Unit Tests Pass
expected: Running `npm test` executes all 50 benchmark engine tests (json-compare, backoff, cost-tracker) and all pass.
result: pass

### 7. End-to-End Mock Flow
expected: Full mock flow works: complete wizard -> confirmation screen -> click Pay (mock) -> processing page shows. Engine runs in background with mock OpenRouter producing results per model.
result: skipped
reason: Blocked by mock payment flow (Test 2)

## Summary

total: 7
passed: 2
issues: 3
pending: 0
skipped: 2

## Gaps

- truth: "Confirmation screen appears after wizard Step 3 showing benchmark summary (model count, image count, estimated cost) and Pay button"
  status: failed
  reason: "User reported: there's a very fast 'benchmark configured' page that pops up for 1 second before forwarding you. It should just take you to the confirmation screen. When you click back to edit from the confirmation screen it loses the prompt in the 'Schema and Prompt' phase. If I go back to the 'Upload Phase' and click edit on the expected_output.json that data is blank (should show the json I input in the initial runthrough). also the confirmation screen say '0 models' when I had 15 selected."
  severity: major
  test: 1
  root_cause: "handleSaveSchema in page.tsx persists to DB but never calls setSavedSchemaData(), so savedSchemaData remains null. handleComplete then overwrites schema_data with {} destroying selectedModelIds, prompt, etc. Also StepSchema sets isComplete=true synchronously before async onComplete(), causing a flash 'Benchmark Configured' page."
  artifacts:
    - path: "src/app/(app)/benchmark/new/page.tsx"
      issue: "savedSchemaData never updated after handleSaveSchema; handleComplete sends savedSchemaData ?? {} to API"
    - path: "src/components/wizard/step-schema.tsx"
      issue: "setIsComplete(true) fires before async onComplete(), causing flash success page"
  missing:
    - "Add setSavedSchemaData(data) call in handleSaveSchema callback"
    - "Remove or skip isComplete success page in StepSchema (let parent handle transition)"
    - "handleComplete should not re-save schema_data or should read current state"
  debug_session: ".planning/debug/02-confirmation-screen.md"
- truth: "Mock payment creates report immediately and redirects to processing page"
  status: failed
  reason: "User reported: getting an error message - 'Something went wrong. Please try again.' In developer tools: :3000/api/checkout:1 Failed to load resource: the server responded with a status of 400 (Bad Request) {\"error\":\"No valid models selected\"}"
  severity: major
  test: 2
  root_cause: "Same root cause as Test 1: handleComplete() sends savedSchemaData ?? {} (which is {}) to the PATCH API, overwriting schema_data and destroying selectedModelIds. Checkout API then reads empty selectedModelIds and returns 400."
  artifacts:
    - path: "src/app/(app)/benchmark/new/page.tsx"
      issue: "handleComplete overwrites schema_data with stale null state"
    - path: "src/app/api/checkout/route.ts"
      issue: "Correctly validates models but receives empty array due to upstream data destruction"
  missing:
    - "Fix savedSchemaData sync (same fix as Test 1)"
  debug_session: ".planning/debug/02-mock-payment-models.md"
- truth: "Mock indicator badge derives state from existing DEBUG_MOCK_* env vars"
  status: failed
  reason: "User reported: pass, but having this duplicated is very confusing. The badge should read DEBUG_MOCK_STRIPE DEBUG_MOCK_OPENROUTER DEBUG_MOCK_EMAIL and build the badge from them, not have a different environment variable"
  severity: minor
  test: 5
  root_cause: "NEXT_PUBLIC_DEBUG_MOCKS is a redundant client-side env var disconnected from DEBUG_MOCK_* server-side vars. Already out of sync in .env.local (only shows 'stripe' when all 3 mocks are active)."
  artifacts:
    - path: "src/lib/debug/mock-config.ts"
      issue: "getClientActiveMocks() reads separate NEXT_PUBLIC_DEBUG_MOCKS instead of deriving from DEBUG_MOCK_*"
    - path: "src/components/debug/mock-indicator.tsx"
      issue: "Reads redundant env var via getClientActiveMocks()"
    - path: "src/components/wizard/confirmation-screen.tsx"
      issue: "Also uses getClientActiveMocks().includes('stripe') for mock payment detection"
  missing:
    - "Create MockProvider context, pass server-read DEBUG_MOCK_* from layout.tsx to client components"
    - "Delete NEXT_PUBLIC_DEBUG_MOCKS from env files"
    - "Update MockIndicator and ConfirmationScreen to use useMocks() hook"
  debug_session: ".planning/debug/02-mock-indicator-env.md"
