# ModelBlitz

## What This Is

ModelBlitz is a one-shot paid benchmarking service for structured data extraction from images. Users upload sample images (receipts, invoices, documents) with their correct JSON output and extraction prompt, pay $14.99, and receive a comprehensive report ranking up to 25 vision models on accuracy, cost, and speed — with exact field-level diffs showing where each model fails. Target audience is micro-SaaS founders, indie hackers, and small AI startups building extraction pipelines.

## Core Value

Users can see exactly which vision model extracts their specific document data most accurately and cheaply — with field-level error diffs showing precisely where each model fails — so they stop overpaying for GPT-4o when a $0.002/call model gets 96% accuracy on their use case.

## Requirements

### Validated

- ✓ User can sign up, log in (email/password, social, magic link) and access past reports — v1.0
- ✓ User can upload 1-10 sample images with correct JSON output for each — v1.0
- ✓ User can provide an extraction prompt (system infers JSON schema from examples, user can override) — v1.0
- ✓ User is guided through a testing plan wizard that allocates a ~$7 API budget based on their priorities — v1.0
- ✓ System optimizes runs-per-model internally to maximize statistical confidence within budget — v1.0
- ✓ System benchmarks selected vision models via OpenRouter with parallel execution — v1.0
- ✓ Results stream to the user in real-time via Supabase Realtime as each model completes — v1.0
- ✓ Report displays ranked table (accuracy, cost/run, median RT, P95 RT, spread) — v1.0
- ✓ Report includes bubble chart visualization (cost vs accuracy, bubble size = P95, opacity = consistency) — v1.0
- ✓ Report includes "Where It Missed" field-level error diffs per model with aggregated error patterns — v1.0
- ✓ Report includes top recommendation with rationale and savings callout — v1.0
- ✓ Report includes cost calculator (queries/day input, current vs recommended model comparison) — v1.0
- ✓ Binary exact-match accuracy by default with toggle for relaxed matching — v1.0
- ✓ User pays $14.99 via Stripe Checkout before benchmarks run — v1.0
- ✓ Report has shareable link (unique URL) and PDF export — v1.0
- ✓ User can access all past reports from their dashboard — v1.0

### Active

<!-- Requirements for next milestone. Defined via /gsd:new-milestone -->

(None yet — define with `/gsd:new-milestone`)

### Out of Scope

- $7.50/mo subscription for new-model updates — post-launch, validate demand for one-time reports first
- User accounts for teams/organizations — individual accounts only for now
- Bring-your-own API keys — we manage all API access via OpenRouter
- Non-vision/text-only benchmarking — future expansion
- Self-hosted/on-prem deployment — SaaS only
- Enterprise features (SSO, audit logs, compliance) — not the target market
- Fuzzy/semantic accuracy scoring — binary exact-match is the differentiator (relaxed matching is cosmetic normalization, not semantic)
- Mobile app — web-first, responsive design handles mobile viewing
- Real-time model monitoring — this is a one-shot report, not a dashboard
- Custom model selection (user picking arbitrary models) — use curated sets from our leaderboard

## Context

- **Current state:** v1.0 MVP shipped 2026-02-12. 11,385 LOC TypeScript across 206 files.
- **Domain:** modelblitz.com (rebranded from modelpick.ai during v1.0)
- **Revenue target:** $2-3k/mo passive income
- **Competitive gap:** No tool shows field-level error diffs for vision model structured extraction. Existing benchmarks test generic tasks, not the user's specific document format.
- **Key insight:** Most builders use GPT-4o for everything and overpay 3-10x because testing 20 models manually is tedious.
- **Internal leaderboard:** Planned for v1.1+ — powers the "balanced" model selection preset in the wizard.
- **Unit economics:** $14.99 price, ~$7 API cost budget, ~50% margin after Stripe fees.
- **Tech stack (actual):** Next.js 16 (App Router) + TypeScript + Tailwind v4, Supabase (Auth + Postgres + Realtime), Stripe, OpenRouter, Resend (email), Vercel deployment.
- **Known tech debt:** Phase 3 visual/interactive items need manual testing (charts, PDF export quality, calculator interactivity). RPT-09 baseline comparison uses text note instead of API integration.

## Constraints

- **Tech stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, deployed all-in-one on Vercel (Fluid Compute for long-running benchmarks)
- **Auth + DB:** Supabase (Auth with social/email/magic link + Postgres + Realtime)
- **API routing:** OpenRouter for all vision model calls (single API, 25 curated models across 5 tiers)
- **Payments:** Stripe Checkout, one-time $14.99
- **Real-time:** Supabase Realtime (postgres_changes) — chose over SSE for tighter Supabase integration
- **Charts:** Pure SVG charts (no charting libraries) for PDF export compatibility
- **Execution time:** Benchmark runs must complete within Vercel Fluid Compute limits (800s on Pro)
- **Budget per report:** ~$7 OpenRouter API cost ceiling ($15 absolute max), system optimizes allocation within this budget
- **Design:** Dark-warm palette — orange primary `#F97316` on void `#0A0A0B`, Inter + JetBrains Mono, "Stripe Checkout simplicity"

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full-stack TypeScript (not Python/FastAPI) | Single language, simpler deployment, shared types | ✓ Good — 11.4k LOC, shared types across client/server |
| All-in-one Vercel deploy with Fluid Compute | Simple deployment, benchmark runs fit within 800s limit | ✓ Good — single deploy target |
| Supabase Realtime instead of SSE | Supabase already in stack; postgres_changes gives real-time updates without custom SSE endpoint | ✓ Good — simpler than SSE, native reconnect |
| Supabase for auth + DB | Built-in social/magic link auth, Postgres, row-level security | ✓ Good — handled all auth requirements, RLS for storage + data |
| Configurable testing plan wizard | Users allocate ~$7 budget across priorities; system optimizes runs-per-model internally | ✓ Good — differentiator from fixed-config tools |
| Progressive disclosure for inputs | User provides images + JSON + prompt; system infers schema with override option | ✓ Good — reduces friction |
| Binary exact-match with relaxed toggle | Strict matching is the differentiator; relaxed mode normalizes formatting only | ✓ Good — clear pass/fail metric |
| Fresh start from prototype | Existing codebase was visual mockup only; built clean Next.js project | ✓ Good — clean architecture |
| No subscription in MVP | Validate one-time report demand before building recurring billing | — Pending validation |
| Pure SVG charts (no charting libraries) | PDF export compatibility; Recharts had issues in this stack | ✓ Good — charts render in PDF |
| Nested concurrency (3 per-model, 10 global) | Rate limit protection without over-throttling | ✓ Good — handles OpenRouter limits |
| Slot-based N-card upload UX | Each image gets its own card with lifecycle states; clearer than shared dropzone | ✓ Good — direct slot-to-image mapping |
| Tailwind v4 CSS-native @theme | Custom dark-warm palette via CSS custom properties | ✓ Good — clean theming |

---
*Last updated: 2026-02-12 after v1.0 milestone*
