---
status: complete
phase: 03-results-and-report
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md
started: 2026-02-12T19:00:00Z
updated: 2026-02-12T19:02:00Z
---

## Current Test

[testing complete - aborted early, blocked by Realtime connection issue]

## Tests

### 1. Live Progress Display
expected: Visit the processing page for an active/completed benchmark. Each selected model shows a progress bar with status badge (Waiting, Running, or Complete). A connection status indicator shows Realtime connection state.
result: issue
reported: "it does that, but I only get a Reconnecting yellow status badge at the top and no running models (openrouter mocked)"
severity: major

### 2. Auto-Redirect to Report
expected: When all benchmark runs complete, the processing page briefly shows "Benchmark complete!" then auto-redirects to the report page (/report/[share_token]) after ~1.5 seconds.
result: skipped
reason: Blocked by Test 1 - Realtime not connecting

### 3. Report Page Loads via Share Token
expected: Navigating to /report/[share_token] loads the report. Header shows report title, model count, image count, and completion date. No login required.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 4. Recommendation Card
expected: Top section shows recommended model with trophy icon, model name and provider, human-readable rationale explaining why it was picked, a 4-metric grid (accuracy, cost, median RT, consistency), and a savings callout badge.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 5. Sortable Ranked Table
expected: Table lists all benchmarked models with columns: rank, model, provider, accuracy, exact match, cost/run, median RT, P95 RT, spread. Clicking any metric column header sorts the table. Top model row is visually highlighted.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 6. Share Button
expected: Clicking the share button copies the report URL to clipboard. Button text changes to "Copied!" for ~2 seconds then reverts.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 7. Bubble Chart (Cost vs Accuracy)
expected: SVG scatter chart with X-axis = cost, Y-axis = accuracy. Each model is a circle sized by P95 latency and shaded by consistency. Provider colors distinguish models. Axis labels and grid lines visible.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 8. Latency and Cost Bar Charts
expected: Two horizontal bar charts: (1) P95 latency sorted fastest-first with provider-colored bars, (2) cost-per-run with provider-colored bars and "FREE" badges on zero-cost models.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 9. Cost Calculator
expected: Interactive section with a daily volume slider (range 10-10,000), model comparison dropdown, and projected monthly/yearly cost figures. Adjusting slider updates costs in real time.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 10. Error Analysis
expected: Section showing top aggregated error patterns with expected vs actual value diffs and occurrence counts. Below that, per-model collapsible sections showing field-level error tables.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 11. Raw Runs Accordion
expected: Collapsible section per model. Expanding shows individual runs with pass/fail badge. Each run can be further expanded to reveal JSON output.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

### 12. PDF Export
expected: Clicking the PDF export button generates and downloads a PDF of the report content. PDF renders on dark background at A4 size.
result: skipped
reason: Blocked by Test 1 - cannot reach report page via normal flow

## Summary

total: 12
passed: 0
issues: 1
pending: 0
skipped: 11

## Gaps

- truth: "Each selected model shows a progress bar with status badge and connection status indicator shows connected state"
  status: failed
  reason: "User reported: it does that, but I only get a Reconnecting yellow status badge at the top and no running models (openrouter mocked)"
  severity: major
  test: 1
  root_cause: "Three compounding issues: (1) Mock checkout never calls runBenchmark() - report sits at 'paid' forever with zero benchmark_runs. (2) Runner checks NEXT_PUBLIC_MOCK_OPENROUTER but env sets DEBUG_MOCK_OPENROUTER - mock runner would try real API calls. (3) Migration 004 may not be applied - Realtime publication missing."
  artifacts:
    - path: "src/app/api/checkout/route.ts"
      issue: "Mock path (lines 119-169) creates report but never invokes runBenchmark()"
    - path: "src/lib/benchmark/runner.ts"
      issue: "Line 55 checks NEXT_PUBLIC_MOCK_OPENROUTER instead of DEBUG_MOCK_OPENROUTER"
    - path: "supabase/migrations/004_realtime_and_shared_runs.sql"
      issue: "May not be applied to hosted Supabase project"
  missing:
    - "Add after(() => runBenchmark(report.id)) to mock checkout path"
    - "Fix runner env var to use DEBUG_MOCK_OPENROUTER or import from mock-config.ts"
    - "Verify migration 004 is applied"
  debug_session: ".planning/debug/realtime-reconnecting.md"
