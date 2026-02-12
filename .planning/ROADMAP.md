# Roadmap: ModelPick

## Overview

ModelPick delivers a paid one-shot benchmarking report for vision model structured data extraction. The roadmap follows the user's journey: first they configure a benchmark (auth, upload, wizard), then they pay and the system runs it (payment, engine), then they see results (progress, report). Three phases, each delivering a complete, verifiable capability boundary.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Configure Benchmark** - Auth, image upload, wizard -- everything before payment
- [ ] **Phase 2: Pay and Run** - Stripe payment triggers benchmark engine execution
- [ ] **Phase 3: Results and Report** - Real-time progress, full report, sharing, export

## Phase Details

### Phase 1: Configure Benchmark
**Goal**: User can sign up, upload sample images with expected JSON, and configure a testing plan ready for payment
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, UPLD-01, UPLD-02, UPLD-03, UPLD-04, WIZD-01, WIZD-02, WIZD-03, WIZD-04, WIZD-05
**Success Criteria** (what must be TRUE):
  1. User can create an account (email/password, Google, GitHub, or magic link) and remain logged in across browser refresh
  2. User can upload 1-10 images via drag-and-drop, see thumbnails, and paste/upload correct JSON output for each with live validation errors
  3. User can provide an extraction prompt and see the system-inferred JSON schema with option to override it
  4. User can configure their testing plan by ranking priorities, selecting model strategy, choosing sample count, and seeing estimated cost and confidence before proceeding to payment
  5. User can access a dashboard showing their past reports (empty state for new users)
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md -- Foundation: Next.js project setup, Tailwind v4, Supabase clients, middleware, types, config, migration
- [x] 01-02-PLAN.md -- Auth UI + Dashboard: login/signup forms, social OAuth, callback routes, dashboard with empty state
- [x] 01-03-PLAN.md -- Wizard Steps 1-2: wizard shell, config step (priorities/strategy/count), upload step (images + JSON editor)
- [x] 01-04-PLAN.md -- Wizard Step 3 + Business Logic: schema inference, cost estimation, model recommendation, completion flow
- [x] 01-05-PLAN.md -- Gap closure: Add storage RLS policies for benchmark-images bucket (fixes upload blocker)
- [x] 01-06-PLAN.md -- Gap closure: Restructure Step 2 to slot-based N-card upload UX with three-state lifecycle

### Phase 2: Pay and Run
**Goal**: User can pay $14.99 via Stripe and the system executes benchmarks across up to 24 vision models with real-time cost control
**Depends on**: Phase 1
**Requirements**: PAY-01, PAY-02, PAY-03, BENCH-01, BENCH-02, BENCH-03, BENCH-04, BENCH-05, BENCH-06
**Success Criteria** (what must be TRUE):
  1. User completes Stripe Checkout at $14.99 and is redirected back to a processing page (payment via hosted checkout, not inline form)
  2. Stripe webhook reliably triggers benchmark execution with idempotency (no duplicate runs, no lost payments)
  3. System benchmarks selected models via OpenRouter, capturing JSON output, response time, token count, cost, and pass/fail per run
  4. JSON comparison uses canonicalization (key sort, number normalization, whitespace) with binary exact-match default and relaxed matching toggle
  5. System enforces per-model concurrency limits with adaptive backoff on rate limits and a hard ~$7 API cost ceiling per report
**Plans**: 6 plans

Plans:
- [x] 02-01-PLAN.md -- Stripe payment infrastructure: checkout API, webhook handler, DB migration, admin client, processing page
- [x] 02-02-PLAN.md -- Benchmark engine utilities: JSON canonicalization/comparison, adaptive backoff, cost tracker, model runner
- [x] 02-03-PLAN.md -- Engine orchestration + email: concurrency-controlled benchmark loop, cost ceiling enforcement, report completion email
- [x] 02-04-PLAN.md -- Gap closure: Fix wizard data flow (savedSchemaData sync, flash page removal, correct model count)
- [x] 02-05-PLAN.md -- Gap closure: Replace NEXT_PUBLIC_DEBUG_MOCKS with MockProvider context deriving from DEBUG_MOCK_* vars
- [ ] 02-06-PLAN.md -- Gap closure: Fix stale closure race in JSON editor callbacks (expectedJson overwritten on every keystroke)

### Phase 3: Results and Report
**Goal**: User sees real-time benchmark progress and receives a comprehensive, shareable report with ranked results, visualizations, error analysis, and export options
**Depends on**: Phase 2
**Requirements**: LIVE-01, LIVE-02, LIVE-03, RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06, RPT-07, RPT-08, RPT-09, RPT-10, RPT-11, RPT-12, RPT-13
**Success Criteria** (what must be TRUE):
  1. User sees real-time progress as each model completes (model name, accuracy so far, completion status) with auto-reconnect on connection drop
  2. Completed report displays a ranked table sortable by accuracy, cost/run, median RT, P95 RT, and spread -- with a top recommendation card showing model name, rationale, and savings callout
  3. Report includes bubble chart (cost vs accuracy, size=P95, opacity=consistency), P95 latency bar chart, cost per run bar chart, and OpenRouter baseline comparison
  4. Report shows "Where It Missed" field-level error diffs per model with aggregated error patterns, plus expandable raw run data with individual pass/fail and JSON diffs
  5. Report is accessible via shareable link (no login required), exportable as PDF, and user receives email with report link on completion
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Configure Benchmark | 6/6 | Complete | 2026-02-11 |
| 2. Pay and Run | 5/6 | Gap closure | - |
| 3. Results and Report | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-11*
*Depth: quick (3-5 phases, 1-3 plans each)*
