# Requirements: ModelPick

**Defined:** 2026-02-11
**Core Value:** Users can see exactly which vision model extracts their specific document data most accurately and cheaply — with field-level error diffs showing precisely where each model fails.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can sign in with social login (Google, GitHub)
- [ ] **AUTH-03**: User can sign in via magic link (email)
- [ ] **AUTH-04**: User session persists across browser refresh
- [ ] **AUTH-05**: User can access past reports from dashboard

### Upload & Input

- [ ] **UPLD-01**: User can upload 1-10 sample images via drag-and-drop with thumbnail preview
- [ ] **UPLD-02**: User can paste or upload correct JSON output for each image with live validation
- [ ] **UPLD-03**: User can provide an extraction prompt
- [ ] **UPLD-04**: System auto-detects JSON schema from provided examples, user can confirm/override

### Testing Plan Wizard

- [ ] **WIZD-01**: User ranks priorities (accuracy, speed, cost) to influence model recommendations
- [ ] **WIZD-02**: User selects model strategy (all models, balanced/recommended, budget-only)
- [ ] **WIZD-03**: User selects number of sample images (1-10) with budget impact shown
- [ ] **WIZD-04**: System optimizes runs-per-model internally to maximize confidence within ~$7 budget
- [ ] **WIZD-05**: User sees estimated API cost and confidence level before payment

### Payment

- [ ] **PAY-01**: User pays $14.99 via Stripe Checkout (hosted redirect)
- [ ] **PAY-02**: Stripe webhook triggers benchmark execution (not success page)
- [ ] **PAY-03**: User receives email receipt with report link

### Benchmark Engine

- [ ] **BENCH-01**: System benchmarks up to 24 curated vision models via OpenRouter
- [ ] **BENCH-02**: Per run: capture full JSON output, response time, token count, cost, pass/fail
- [ ] **BENCH-03**: JSON canonicalization before comparison (key sort, number normalization, whitespace)
- [ ] **BENCH-04**: Binary exact-match accuracy as default with relaxed matching toggle
- [ ] **BENCH-05**: Per-model concurrency limits with adaptive backoff on 429s
- [ ] **BENCH-06**: Real-time cost tracking with hard ceiling (~$7 budget)

### Real-Time Progress

- [ ] **LIVE-01**: Results stream to user via Supabase Realtime as each model completes
- [ ] **LIVE-02**: Progress shows model name, accuracy so far, completion status
- [ ] **LIVE-03**: Client auto-reconnects if connection drops during benchmark

### Report

- [ ] **RPT-01**: Ranked table sortable by accuracy, cost/run, median RT, P95 RT, spread
- [ ] **RPT-02**: Top recommendation card with model name, rationale, and savings callout
- [ ] **RPT-03**: Bubble chart (X=cost, Y=accuracy, size=P95, opacity=consistency)
- [ ] **RPT-04**: P95 latency comparison bar chart
- [ ] **RPT-05**: Cost per run bar chart
- [ ] **RPT-06**: "Where It Missed" field-level error diffs per model (expected vs actual)
- [ ] **RPT-07**: Aggregated error patterns ("Claude Haiku misses tax field 30%")
- [ ] **RPT-08**: Cost calculator with daily volume slider + comparison model dropdown
- [ ] **RPT-09**: OpenRouter baseline comparison (your times vs global medians)
- [ ] **RPT-10**: Raw run data expandable per model with individual pass/fail and JSON diffs
- [ ] **RPT-11**: Shareable link (unique URL, viewable without login)
- [ ] **RPT-12**: PDF export
- [ ] **RPT-13**: Email with report link sent on completion

## v2 Requirements

### Subscription

- **SUB-01**: User can subscribe to $7.50/mo for automatic new-model re-benchmarks
- **SUB-02**: User receives email when new models are tested against their data
- **SUB-03**: User can manage/cancel subscription from dashboard

### Configurable Enhancements

- **CFG-01**: Internal generic leaderboard powering model presets
- **CFG-02**: Batch documents (10+ images) for deeper accuracy measurement

### Extended Features

- **EXT-01**: Multi-page PDF document support with page-by-page extraction
- **EXT-02**: A/B prompt testing (compare extraction prompt variations)
- **EXT-03**: API access for programmatic benchmark runs (CI/CD)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bring-your-own API keys | Eliminates business model; users with keys can test manually already |
| Non-vision / text-only benchmarking | Dilutes focus; text LLM benchmarking is crowded (Promptfoo, Vellum, Braintrust) |
| Real-time model monitoring | Different product entirely — ongoing infrastructure vs one-shot report |
| Custom evaluation metrics / LLM-as-judge | Over-engineers the product; binary exact-match is the differentiator |
| Enterprise features (SSO, audit logs) | Wrong market — targeting indie hackers at $14.99, not enterprise |
| Self-hosted / on-prem | 50x complexity increase for minimal demand |
| Team accounts / RBAC | Shareable links solve 80% of collaboration need |
| Fuzzy/semantic accuracy scoring | Binary match is the differentiator; relaxed matching handles formatting only |
| Prompt engineering / optimization | Turns benchmarking into consulting; different product |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| UPLD-01 | — | Pending |
| UPLD-02 | — | Pending |
| UPLD-03 | — | Pending |
| UPLD-04 | — | Pending |
| WIZD-01 | — | Pending |
| WIZD-02 | — | Pending |
| WIZD-03 | — | Pending |
| WIZD-04 | — | Pending |
| WIZD-05 | — | Pending |
| PAY-01 | — | Pending |
| PAY-02 | — | Pending |
| PAY-03 | — | Pending |
| BENCH-01 | — | Pending |
| BENCH-02 | — | Pending |
| BENCH-03 | — | Pending |
| BENCH-04 | — | Pending |
| BENCH-05 | — | Pending |
| BENCH-06 | — | Pending |
| LIVE-01 | — | Pending |
| LIVE-02 | — | Pending |
| LIVE-03 | — | Pending |
| RPT-01 | — | Pending |
| RPT-02 | — | Pending |
| RPT-03 | — | Pending |
| RPT-04 | — | Pending |
| RPT-05 | — | Pending |
| RPT-06 | — | Pending |
| RPT-07 | — | Pending |
| RPT-08 | — | Pending |
| RPT-09 | — | Pending |
| RPT-10 | — | Pending |
| RPT-11 | — | Pending |
| RPT-12 | — | Pending |
| RPT-13 | — | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 0
- Unmapped: 39 ⚠️

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
