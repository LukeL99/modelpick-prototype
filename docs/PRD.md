# Product Requirements Document: ModelPick

**Date:** 2026-02-11
**Version:** 2.0 (Structured Data Extraction Pivot)
**Domain:** modelpick.ai

---

## 1. Product Overview

**ModelPick** is a one-shot vision model benchmarking report for structured data extraction. Users upload 3 sample images (receipts, invoices, documents) plus the correct JSON output, pay $14.99, and receive a statistically rigorous report ranking 20 vision models on accuracy, cost, and speed — with exact diffs showing where each model fails.

**One-liner:** "Upload 3 receipts. Get a report telling you which vision model extracts your data perfectly — and which ones mess up field #7."

**Target market:** Micro-SaaS founders, indie hackers, and small AI startups building structured data extraction pipelines. Goal: $2-3k/mo passive income. NOT enterprise.

---

## 2. Problem Statement

Builders doing structured data extraction from images (receipts, invoices, forms, IDs) pick vision models based on vibes. They're overpaying or getting bad accuracy because:

- Testing 20 vision models manually on their specific document type is tedious
- "Works on the demo" ≠ works reliably at scale — you need 50+ runs to know consistency
- Existing benchmarks test generic tasks, not YOUR receipt format / YOUR invoice schema
- No tool shows you exactly WHERE a model fails (which field, what it got wrong)

**Result:** Most builders use GPT-4o for everything, overpay by 3-10x, and don't know a $0.002/call model gets 96% accuracy on their exact use case.

---

## 3. Solution

Upload 3 sample images + their correct JSON → pay $14.99 → get a ranked report of 20 vision models tested 50 times each, with binary exact-match accuracy, cost-per-run, response times, and field-level error diffs.

Stripe Checkout simplicity. No API keys, no YAML config, no SDK integration. Web form → report.

---

## 4. Core Focus: Structured Data Extraction

### What Users Provide
- **3 sample images** — Photos/scans of receipts, invoices, documents, forms, etc.
- **Correct JSON output** — The exact structured data that should be extracted from each image
- No prompt engineering needed — ModelPick generates the extraction prompt

### Evaluation Method
- **Binary exact-match accuracy** — The extracted JSON either matches the expected output or it doesn't
- NOT fuzzy semantic similarity, NOT embedding cosine distance
- Field-by-field comparison: every key-value pair must match exactly
- 50 runs per model for statistical significance (1,000 total API calls per report)

### Killer Feature: "Where It Missed"
- Field-level error diffs for every failure
- Shows exactly which fields each model gets wrong and what it returned instead
- Example: "Model got `total: 42.50` but expected `total: 42.55`" — the one thing no leaderboard shows
- Aggregated error patterns: "Claude Haiku misses the tax field 30% of the time"

---

## 5. MVP Features

### 5.1 Image Upload + Schema Input
- **Image upload** — 3 sample images (drag-and-drop, common formats: JPG, PNG, PDF)
- **Expected JSON** — Text area or file upload for the correct structured output per image
- **Schema auto-detection** — Infer JSON schema from provided examples (optional enhancement)

### 5.2 Model Selection (20 Vision Models)

Pre-selected set curated across tiers:

**Budget (6):**
| Model | Est. Cost/Run |
|-------|--------------|
| Gemini 3 Flash Preview | ~$0.001 |
| GPT-5 Nano | ~$0.002 |
| Claude Haiku 4.5 | ~$0.002 |
| Llama 4 Scout | ~$0.001 |
| Gemma 3 12B | ~$0.001 |
| Phi-4 Vision | ~$0.001 |

**Mid-Tier (7):**
| Model | Est. Cost/Run |
|-------|--------------|
| Claude Sonnet 4.5 | ~$0.015 |
| GPT-5 | ~$0.020 |
| Gemini 3 Pro Preview | ~$0.010 |
| Mistral Large 3 | ~$0.012 |
| Qwen 2.5 VL 72B | ~$0.008 |
| Pixtral 12B | ~$0.005 |
| InternVL2.5 78B | ~$0.008 |

**Premium (5):**
| Model | Est. Cost/Run |
|-------|--------------|
| Claude Opus 4.6 | ~$0.075 |
| GPT-5.2 Pro | ~$0.060 |
| Gemini 3 Ultra | ~$0.050 |
| DeepSeek V4 | ~$0.030 |
| Amazon Nova Micro | ~$0.020 |

**Specialist (2):**
| Model | Est. Cost/Run |
|-------|--------------|
| Moondream 2B | ~$0.0005 |
| LLaVA-OneVision 72B | ~$0.008 |

### 5.3 Benchmarking Engine

- **50 runs per model** across the 3 sample images (for statistical significance)
- **20 models** = 1,000 total API calls per report

**Per run, capture:**
- Full JSON output
- Response time (total, not TTFT)
- Token count (input + output)
- Cost (from OpenRouter pricing)
- Pass/fail (binary exact-match against expected JSON)

**Per model, compute:**
- **Accuracy** — % of runs where JSON output exactly matches expected (out of 50)
- **Cost per run** — Average actual $ amount
- **Median response time (P50)** — Typical speed
- **P95 response time** — Worst-case speed
- **Spread (IQR: P75-P25)** — Consistency metric, shown as ±Xs
- **Error patterns** — Which fields fail most often, what the model returns instead

### 5.4 Report

**Ranked Table:**
- Models sorted by accuracy (primary), then cost (secondary)
- Columns: Model | Accuracy | Cost/Run | Median RT | P95 RT | Spread

**Top Recommendation:**
- "For your use case, we recommend X" with concise rationale

**Bubble Chart (primary visualization):**
- X-axis: Cost per run
- Y-axis: Accuracy (%)
- Bubble size: P95 response time
- Bubble opacity: Spread (lower spread = more opaque = more consistent)
- CSS-based implementation (NOT Recharts ScatterChart — broken in this stack)

**OpenRouter Baseline Comparison:**
- Measured median response time vs. OpenRouter's global median per model
- Shows if your document type is harder/easier than average

**Cost Calculator:**
- Input: queries/day
- Dynamic comparison model dropdown (user picks their current model)
- Shows monthly cost with current model vs. recommended model
- "Switching saves $X/month"

**"Where It Missed" Error Diffs:**
- Per model, expandable section showing exact field-level diffs
- Aggregated: "This model fails on [field] X% of the time"
- Side-by-side: expected vs. actual JSON with highlighted differences

**Other:**
- Shareable link (unique URL, no auth)
- PDF export
- Raw outputs (expandable, all 50 runs per model)

### 5.5 Payment
- **$14.99 per report** — Stripe Checkout, one-time
- Payment before running benchmarks
- Email receipt with report link
- **+$7.50/mo recurring subscription** — Tests only NEW models as they release, emails updated comparison. Monthly API cost: ~$0.30-0.80

---

## 6. User Flow

```
1. LANDING PAGE
   → User reads value prop, sees example report
   → Understands pricing ($14.99 per report)

2. "Benchmark My Data" CTA
   → Navigates to upload form

3. UPLOAD FORM
   → Uploads 3 sample images (receipts, invoices, etc.)
   → Pastes or uploads correct JSON for each image
   → Reviews 20-model lineup (optional: toggle models)

4. PAYMENT
   → Stripe Checkout — $14.99
   → Email captured for report delivery
   → Optional: +$7.50/mo for ongoing new-model updates

5. PROCESSING (real-time via WebSocket)
   → Results stream in as each model completes
   → "Claude Sonnet 4.5: 94% accuracy ✅ (1.2s median)"
   → Progress bar / model-by-model completion
   → Estimated total: 1-2 minutes

6. REPORT
   → Full interactive dashboard
   → Bubble chart, ranked table, error diffs
   → Cost calculator
   → Share link + PDF download
   → Email with report link sent
```

---

## 7. Pricing & Unit Economics

### Per Report
| Item | Amount |
|------|--------|
| **Price** | $14.99 |
| API costs (budget tier: ~$0.15) | -$0.15 |
| API costs (mid tier: ~$1.50) | -$1.50 |
| API costs (premium tier: ~$5.10) | -$5.10 |
| **Total API cost** | **-$6.75** |
| Stripe fees (~4.9%) | -$0.73 |
| **Net margin** | **~$7.50 (50%)** |

### Monthly Subscription (+$7.50/mo)
- Only benchmarks NEW models as they release (not full re-run)
- Emails updated comparison report
- Monthly API cost: ~$0.30-0.80
- Net margin: ~$6.70-7.20/mo per subscriber

### Revenue Targets
- Month 1: 50 reports = $750 revenue, ~$375 profit
- Month 3: 200 reports/mo + 50 subscribers = $3,375/mo revenue
- Goal: $2-3k/mo passive income

---

## 8. Architecture

### Parallelization Strategy
- **20 model workers** — One asyncio task per model
- **asyncio.Semaphore(5) per model** — Max 5 concurrent requests per model
- **100 max parallel requests** total (20 × 5)
- **Model-based partitioning** — NOT a flat thread pool; prevents cross-provider rate limit collisions
- **Adaptive backoff on 429s** — Per-model exponential backoff with jitter
- **Estimated runtime:** 1-2 minutes per report

### Real-Time Updates
- **WebSocket** — Results stream to frontend as each model completes its 50 runs
- Progress: model name, accuracy so far, completion status
- No polling; push-based

### Tech Stack

**Frontend:**
- React 19 + Vite — Fast builds, modern DX
- Tailwind CSS v4 — Utility-first, dark mode native
- CSS-based charts — Scatter/bubble plots (NOT Recharts for these; Recharts ScatterChart is broken)
- React Router — Client-side routing

**Backend:**
- Python + FastAPI + asyncio — Parallelization-first architecture
- OpenRouter API — Single API for all 20 vision models
- Stripe API — $14.99 checkout + $7.50/mo subscription
- WebSocket — Real-time result streaming

**Database:**
- SQLite (via Turso or local) — Reports, results, metadata
- Or Postgres (Neon/Supabase) if scaling

**Infrastructure:**
- Vercel (frontend) + Railway/Fly.io (Python backend)
- Upstash Redis — Rate limiting, job queue
- Resend — Transactional email (report delivery)

---

## 9. Brand & Design

- **Palette:** Dark-warm — orange primary `#F97316` on void `#0A0A0B`
- **Typography:** Inter (body) + JetBrains Mono (code/data)
- **Aesthetic:** "Stripe Checkout simplicity" — clean, fast, not enterprise
- **Domain:** modelpick.ai
- **Tone:** Direct, technical but approachable, indie-focused

---

## 10. Glossary & Standardization

| Term | Definition |
|------|-----------|
| **Accuracy** | % of runs where extracted JSON exactly matches expected output (binary) |
| **Response Time** | Total time from request to complete response (NOT "latency") |
| **Median (P50)** | 50th percentile response time — typical performance |
| **P95** | 95th percentile response time — worst-case performance |
| **Spread** | IQR (P75 - P25), shown as ±Xs — measures consistency |
| **Cost/Run** | Actual dollar cost per single API call |
| **Error Diff** | Field-level comparison showing expected vs. actual values |

Note: TTFT (Time to First Token) is deprioritized — not meaningful for structured extraction where you need the complete JSON.

---

## 11. Success Metrics

### Launch (Month 1)
- 50+ reports sold
- <5% refund rate
- Report completion time <2 minutes
- Landing page conversion rate >3%

### Growth (Month 3)
- 200+ reports/month
- $2,000+/month revenue
- 20%+ convert to monthly subscription
- 10% return for second report
- NPS >40

### Validation Threshold
- If <20 reports in first month → re-evaluate positioning
- If >50% ask for non-vision features → consider expanding scope

---

## 12. Future Features (Post-MVP)

### Near-term (Month 2-3)
- **User accounts** — Save reports, manage subscriptions
- **Batch documents** — Upload 10+ images for deeper accuracy measurement
- **Custom schemas** — Define expected output format via JSON Schema editor
- **Prompt template library** — Pre-built extraction prompts for common document types (receipts, invoices, W-2s)

### Medium-term (Month 4-6)
- **Multi-page documents** — PDF support with page-by-page extraction
- **Confidence scoring** — Beyond binary: partial credit for almost-right fields
- **A/B prompt testing** — Compare extraction prompt variations
- **API access** — Programmatic benchmark runs for CI/CD
- **Historical trends** — Track model performance over time

### Long-term
- **Non-vision benchmarks** — Expand to text-only LLM benchmarking (original V1 concept)
- **Team plans** — Shared reports, team billing
- **Prompt optimization** — AI-powered suggestions for better extraction prompts

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenRouter rate limits | Can't complete 1,000 calls | Model-based partitioning + adaptive backoff per model |
| Model pricing changes | Stale cost data | Fetch fresh pricing at report time from OpenRouter |
| Low conversion rate | Revenue miss | A/B test landing page, add free 3-model preview |
| API costs exceed margin | Negative economics | Monitor per-report cost, adjust model count or price |
| Image quality variance | Inconsistent accuracy | Document image requirements, auto-validate uploads |
| Binary matching too strict | Everything looks 0% | Normalize whitespace/formatting before comparison; show partial-match info in diffs |
| 50 runs × 20 models slow | Bad UX | Parallelization (100 concurrent), WebSocket streaming, 1-2 min target |

---

## 14. Non-Goals (MVP)

- ❌ User accounts / authentication (reports via unique link + email)
- ❌ Self-hosted / on-prem deployment
- ❌ Bring-your-own API keys
- ❌ Real-time model monitoring
- ❌ Non-vision / text-only benchmarking (future)
- ❌ Enterprise features (SSO, audit logs, compliance)
- ❌ Fuzzy/semantic accuracy scoring (binary exact-match only)

We are NOT building another LLMOps platform. We are building a simple, paid benchmarking report for vision model structured data extraction.

---

## Changelog

### V2 (2026-02-11) — Structured Data Extraction Pivot
- **Focus narrowed** from generic prompt benchmarking to structured data extraction from images
- **Input changed** from text prompt + expected output to image upload + correct JSON
- **Models changed** from 20 general LLMs to 20 vision models (2026 lineup)
- **Runs increased** from 3 per model to 50 per model (1,000 total) for statistical significance
- **Accuracy method changed** from fuzzy semantic similarity to binary exact-match
- **Added "Where It Missed"** field-level error diffs — killer differentiator
- **Price increased** from $9.99 to $14.99 (due to 1,000 API calls per report)
- **Added $7.50/mo subscription** for new-model-only re-benchmarks
- **Backend changed** from Node.js/Express to Python/FastAPI/asyncio (parallelization)
- **Charts changed** from Recharts to CSS-based (Recharts ScatterChart broken)
- **Removed TTFT** as metric (not meaningful for structured extraction)
- **Standardized terminology** "Response Time" not "Latency"; added Spread (IQR)
- **Architecture added** model-based partitioning with per-model semaphores
- **Visualizations added** bubble chart, OpenRouter baseline comparison, dynamic cost calculator
