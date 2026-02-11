# Phase 2: Pay and Run - Research

**Researched:** 2026-02-11
**Domain:** Stripe payment integration, OpenRouter vision API, benchmark execution engine, JSON comparison, concurrency control, cost tracking
**Confidence:** HIGH

## Summary

Phase 2 converts a configured benchmark draft into a paid, executed benchmark report. The scope covers three technical domains: (1) Stripe Checkout hosted redirect for $14.99 one-time payment with webhook-driven execution trigger and idempotent processing; (2) a benchmark engine that calls up to 24 vision models via OpenRouter's chat completions API, passing images and extraction prompts, capturing JSON output, response time, token counts, and per-request cost; and (3) a JSON comparison system using canonicalization (key sort, number normalization, whitespace stripping) for binary exact-match scoring with a relaxed matching toggle.

The execution environment is Vercel Fluid Compute with up to 800s on the Pro plan. The Stripe webhook handler creates a report record, then uses Next.js `after()` (backed by Vercel `waitUntil`) to run the benchmark engine in the background after returning a 200 response to Stripe. The engine enforces per-model concurrency limits using `p-limit`, implements adaptive exponential backoff with jitter on 429 rate limit responses, and tracks cumulative API cost in real-time against a hard ~$7 ceiling. For PAY-03 (email receipt with report link), Stripe's built-in receipt emails handle payment confirmation, and Resend with React Email handles the report-link notification after benchmark completion.

**Primary recommendation:** Use Stripe Checkout in hosted redirect mode (not embedded elements), trigger benchmark execution from the `checkout.session.completed` webhook event using Next.js `after()` for background processing, call OpenRouter's `/api/v1/chat/completions` endpoint with `response_format: { type: "json_object" }` for structured output, and compare results using a custom canonicalization function (key sort + number normalization + whitespace trim) rather than an RFC 8785 library (the RFC handles edge cases irrelevant to JSON-to-JSON comparison).

## Standard Stack

### Core (Phase 2 additions to existing stack)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.x | Stripe API for server-side checkout sessions and webhook handling | Official Stripe Node.js SDK. TypeScript built-in. Version-locked API compatibility since v12. |
| resend | ^6.9.x | Transactional email sending (report completion notification) | Developer-focused email API. React Email integration. Free tier covers MVP volume. |
| @react-email/components | ^5.x | Build email templates with React components | JSX email templates, Tailwind 4 support, React 19 compatible. Same team as Resend. |
| p-limit | ^7.2.x | Per-model concurrency limiting for parallel API calls | 80M+ weekly downloads. Simple promise-based concurrency control. ESM + TypeScript. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.1.x (existing) | Generate idempotency keys, share tokens | Already in project from Phase 1. |
| zod | ^3.23.x (existing) | Validate webhook payloads, API responses | Already in project from Phase 1. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| stripe (server SDK) | @stripe/stripe-js (client SDK) | Client SDK is for embedded elements. Hosted redirect only needs server SDK to create session + handle webhooks. No client-side Stripe JS needed. |
| resend | Stripe email receipts only | Stripe sends payment receipts automatically, but cannot send custom "your report is ready" email with report link. Need Resend for the report completion email. |
| p-limit | p-queue | p-queue adds priority queuing, pause/resume, introspection. Overkill for simple per-model concurrency capping. p-limit is lighter and sufficient. |
| p-limit | Custom semaphore | p-limit handles edge cases (promise rejection, cleanup) and is well-tested. Custom semaphore for 50 lines of code is not worth the maintenance. |
| Custom JSON canonicalization | json-canonicalize (RFC 8785) | RFC 8785 handles IEEE 754 number serialization edge cases irrelevant to our use case. We need key sorting + whitespace normalization + number string normalization for JSON-to-JSON comparison, not cryptographic canonicalization. Custom ~40 lines is simpler and more targeted. |
| Custom JSON canonicalization | canonicalize npm | Same RFC 8785 concern. Also, canonicalize focuses on serialization determinism, not comparison normalization (trimming whitespace from string values, normalizing "8.00" to "8"). |
| after() (Next.js) | Supabase Edge Functions | Supabase Edge Functions have a 400s wall clock limit and require separate deployment. Vercel Fluid Compute gives 800s on Pro. Keeping execution in the Next.js app simplifies deployment and shared code. |
| after() (Next.js) | Inngest / Trigger.dev | External job queue adds infrastructure. For MVP, after() with 800s Fluid Compute is sufficient. If benchmarks grow beyond 800s, migrate to a job queue then. |

**Installation:**
```bash
npm install stripe resend @react-email/components p-limit
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
src/
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts              # POST: Create Stripe Checkout session
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts          # POST: Stripe webhook handler
│   ├── (app)/
│   │   └── benchmark/
│   │       └── [id]/
│   │           └── processing/
│   │               └── page.tsx      # Post-payment processing/waiting page
│   └── checkout/
│       ├── success/
│       │   └── page.tsx              # Stripe redirect success page
│       └── cancel/
│           └── page.tsx              # Stripe redirect cancel page
├── lib/
│   ├── stripe/
│   │   ├── client.ts                 # Stripe server client singleton
│   │   └── config.ts                 # Price IDs, webhook secret, Stripe config
│   ├── benchmark/
│   │   ├── engine.ts                 # Main benchmark orchestration loop
│   │   ├── runner.ts                 # Single model benchmark runner (API call + timing)
│   │   ├── json-compare.ts           # Canonicalization + exact-match + relaxed comparison
│   │   ├── cost-tracker.ts           # Real-time cost accumulation with ceiling enforcement
│   │   └── backoff.ts               # Adaptive exponential backoff with jitter for 429s
│   ├── email/
│   │   └── send-report-ready.ts     # Send report completion email via Resend
│   └── config/
│       └── constants.ts              # (extend) Add Stripe, OpenRouter config constants
├── emails/
│   └── report-ready.tsx              # React Email template for report completion
└── types/
    └── database.ts                   # (extend) Add benchmark_runs table types
supabase/
└── migrations/
    └── 003_benchmark_runs.sql        # Per-run results table + RLS + indexes
```

### Pattern 1: Stripe Checkout Hosted Redirect (One-Time Payment)
**What:** Create a Stripe Checkout Session server-side, redirect user to Stripe's hosted page, handle payment result via webhook.
**When to use:** PAY-01 payment flow.
**Confidence:** HIGH (official Stripe docs, verified with Next.js quickstart)
```typescript
// app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { draftId } = await request.json();

  // Verify draft exists, belongs to user, and is in 'ready' status
  const { data: draft } = await supabase
    .from("benchmark_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .eq("status", "ready")
    .single();

  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: draftId,  // Link session to draft
    metadata: {
      draft_id: draftId,
      user_id: user.id,
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 1499,  // $14.99 in cents
          product_data: {
            name: "ModelPick Benchmark Report",
            description: `Vision model benchmark across ${draft.selected_models?.length || 0} models`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/benchmark/new?draft=${draftId}`,
  });

  return NextResponse.json({ url: session.url });
}

// Client-side redirect
async function handleCheckout(draftId: string) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId }),
  });
  const { url } = await res.json();
  window.location.href = url;  // Redirect to Stripe hosted page
}
```

### Pattern 2: Stripe Webhook with Idempotent Benchmark Trigger
**What:** Receive `checkout.session.completed` webhook, verify signature, create report record, trigger benchmark in background. Use database-level idempotency (unique constraint on stripe_session_id) to prevent duplicate processing.
**When to use:** PAY-02 webhook-driven execution.
**Confidence:** HIGH (official Stripe webhook docs + Next.js App Router pattern)
```typescript
// app/api/webhooks/stripe/route.ts
import { after } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBenchmark } from "@/lib/benchmark/engine";

export async function POST(request: Request) {
  const body = await request.text();  // MUST use .text() not .json()
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const draftId = session.metadata?.draft_id;
    const userId = session.metadata?.user_id;

    if (!draftId || !userId) {
      return new Response("Missing metadata", { status: 400 });
    }

    const supabase = createAdminClient();  // Service role for cross-user operations

    // Idempotency: check if report already exists for this session
    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("stripe_session_id", session.id)
      .single();

    if (existing) {
      // Already processed -- idempotent return
      return new Response("Already processed", { status: 200 });
    }

    // Create report record from draft snapshot
    const { data: draft } = await supabase
      .from("benchmark_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (!draft) return new Response("Draft not found", { status: 404 });

    const { data: report } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        draft_id: draftId,
        stripe_session_id: session.id,
        status: "paid",
        config_snapshot: {
          config_data: draft.config_data,
          upload_data: draft.upload_data,
          schema_data: draft.schema_data,
          selected_models: draft.selected_models,
        },
        image_paths: (draft.upload_data as any)?.images?.map((i: any) => i.path) || [],
        extraction_prompt: (draft.schema_data as any)?.prompt || "",
        json_schema: (draft.schema_data as any)?.userSchema || (draft.schema_data as any)?.inferredSchema || {},
      })
      .select()
      .single();

    // Update draft status
    await supabase
      .from("benchmark_drafts")
      .update({ status: "paid" })
      .eq("id", draftId);

    // Trigger benchmark in background (after response sent to Stripe)
    after(async () => {
      await runBenchmark(report!.id);
    });
  }

  return new Response("OK", { status: 200 });
}
```

### Pattern 3: OpenRouter Vision API Call with Structured JSON Output
**What:** Call OpenRouter's chat completions API with image content (base64 or URL) and extraction prompt, requesting JSON output via response_format.
**When to use:** BENCH-01/BENCH-02 per-model benchmark runs.
**Confidence:** HIGH (official OpenRouter API docs)
```typescript
// lib/benchmark/runner.ts
import { CURATED_MODELS } from "@/lib/config/models";
import type { ModelInfo } from "@/types/benchmark";

interface RunResult {
  modelId: string;
  output: string;            // Raw JSON string from model
  parsedOutput: unknown;     // Parsed JSON object
  responseTimeMs: number;    // Wall-clock response time
  promptTokens: number;      // From usage.prompt_tokens
  completionTokens: number;  // From usage.completion_tokens
  totalTokens: number;       // From usage.total_tokens
  cost: number;              // From usage.cost (credit cost)
  success: boolean;          // Whether output is valid JSON
  error?: string;            // Error message if failed
}

export async function runModelOnce(
  model: ModelInfo,
  imageUrl: string,        // Public URL of image in Supabase Storage
  extractionPrompt: string,
  jsonSchema: Record<string, unknown>
): Promise<RunResult> {
  const startTime = performance.now();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://modelpick.ai",
        "X-Title": "ModelPick",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,       // Deterministic for benchmarking
        max_tokens: 4096,     // Sufficient for structured extraction
      }),
    });

    const responseTimeMs = performance.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        modelId: model.id,
        output: "",
        parsedOutput: null,
        responseTimeMs,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
        success: false,
        error: `HTTP ${response.status}: ${errorBody}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = data.usage || {};

    let parsedOutput: unknown = null;
    let success = false;
    try {
      parsedOutput = JSON.parse(content);
      success = true;
    } catch {
      // Model returned non-JSON content
    }

    return {
      modelId: model.id,
      output: content,
      parsedOutput,
      responseTimeMs,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      cost: usage.cost || 0,
      success,
      error: success ? undefined : "Model did not return valid JSON",
    };
  } catch (err) {
    return {
      modelId: model.id,
      output: "",
      parsedOutput: null,
      responseTimeMs: performance.now() - startTime,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
```

### Pattern 4: JSON Canonicalization and Comparison
**What:** Canonicalize JSON output for deterministic comparison. Key sort recursively, normalize numbers (strip trailing zeros, standardize format), trim whitespace from string values. Binary exact-match compares canonical forms. Relaxed mode additionally normalizes whitespace, casing, and formatting.
**When to use:** BENCH-03/BENCH-04 accuracy scoring.
**Confidence:** HIGH (standard JSON comparison approach, custom ~50 lines)
```typescript
// lib/benchmark/json-compare.ts

/**
 * Canonicalize a JSON value for deterministic comparison.
 * - Objects: sort keys alphabetically, recurse into values
 * - Arrays: preserve order, recurse into elements
 * - Numbers: normalize via parseFloat -> toString (strips trailing zeros)
 * - Strings: trim whitespace
 * - null/boolean: pass through
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return parseFloat(value.toString());
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

/**
 * Relaxed canonicalization for "close enough" matching.
 * Adds: lowercase strings, strip all whitespace from strings, normalize number strings.
 */
export function canonicalizeRelaxed(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return parseFloat(value.toString());
  if (typeof value === "string") {
    // Try parsing as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") {
      return parseFloat(num.toString());
    }
    // Normalize: lowercase, collapse whitespace, trim
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalizeRelaxed);
  }

  if (typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalizeRelaxed((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

/**
 * Compare two JSON values after canonicalization.
 * Returns true if canonical forms are deeply equal.
 */
export function jsonMatch(
  expected: unknown,
  actual: unknown,
  relaxed: boolean = false
): boolean {
  const canonFn = relaxed ? canonicalizeRelaxed : canonicalize;
  const a = JSON.stringify(canonFn(expected));
  const b = JSON.stringify(canonFn(actual));
  return a === b;
}

/**
 * Compute field-level diff between expected and actual JSON objects.
 * Returns array of field paths where values differ.
 */
export function fieldDiff(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  relaxed: boolean = false,
  prefix: string = ""
): Array<{ path: string; expected: unknown; actual: unknown }> {
  const diffs: Array<{ path: string; expected: unknown; actual: unknown }> = [];
  const canonFn = relaxed ? canonicalizeRelaxed : canonicalize;

  const allKeys = new Set([
    ...Object.keys(expected),
    ...Object.keys(actual),
  ]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const expVal = expected[key];
    const actVal = actual[key];

    if (!(key in actual)) {
      diffs.push({ path, expected: expVal, actual: undefined });
    } else if (!(key in expected)) {
      diffs.push({ path, expected: undefined, actual: actVal });
    } else if (
      typeof expVal === "object" && expVal !== null && !Array.isArray(expVal) &&
      typeof actVal === "object" && actVal !== null && !Array.isArray(actVal)
    ) {
      diffs.push(
        ...fieldDiff(
          expVal as Record<string, unknown>,
          actVal as Record<string, unknown>,
          relaxed,
          path
        )
      );
    } else {
      const canonExp = JSON.stringify(canonFn(expVal));
      const canonAct = JSON.stringify(canonFn(actVal));
      if (canonExp !== canonAct) {
        diffs.push({ path, expected: expVal, actual: actVal });
      }
    }
  }

  return diffs;
}
```

### Pattern 5: Concurrency Control with Adaptive Backoff
**What:** Use `p-limit` for per-model concurrency caps. On 429 responses, implement exponential backoff with jitter and respect Retry-After headers.
**When to use:** BENCH-05 rate limit handling.
**Confidence:** HIGH (p-limit is industry standard, backoff is well-documented pattern)
```typescript
// lib/benchmark/backoff.ts

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60_000;

export interface BackoffConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_CONFIG: BackoffConfig = {
  maxRetries: MAX_RETRIES,
  baseDelayMs: BASE_DELAY_MS,
  maxDelayMs: MAX_DELAY_MS,
};

/**
 * Execute an async function with adaptive exponential backoff on 429 errors.
 * Respects Retry-After header when present.
 */
export async function withBackoff<T>(
  fn: () => Promise<Response>,
  config: BackoffConfig = DEFAULT_CONFIG
): Promise<Response> {
  let attempt = 0;

  while (true) {
    const response = await fn();

    if (response.status !== 429 || attempt >= config.maxRetries) {
      return response;
    }

    attempt++;

    // Respect Retry-After header if present
    const retryAfter = response.headers.get("retry-after");
    let delayMs: number;

    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      delayMs = isNaN(seconds) ? config.baseDelayMs : seconds * 1000;
    } else {
      // Exponential backoff with jitter
      const exponential = config.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * exponential * 0.5;
      delayMs = Math.min(exponential + jitter, config.maxDelayMs);
    }

    console.log(`Rate limited (429). Retry ${attempt}/${config.maxRetries} after ${Math.round(delayMs)}ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
```

### Pattern 6: Real-Time Cost Tracking with Hard Ceiling
**What:** Accumulate per-request costs in a shared tracker. Before each API call, check if remaining budget allows the estimated cost. Abort all pending work if ceiling is reached.
**When to use:** BENCH-06 cost ceiling enforcement.
**Confidence:** HIGH (straightforward accumulation pattern)
```typescript
// lib/benchmark/cost-tracker.ts

export class CostTracker {
  private spent: number = 0;
  private ceiling: number;

  constructor(ceiling: number) {
    this.ceiling = ceiling;
  }

  /** Record cost from a completed API call */
  addCost(cost: number): void {
    this.spent += cost;
  }

  /** Get current total spend */
  getSpent(): number {
    return this.spent;
  }

  /** Get remaining budget */
  getRemaining(): number {
    return Math.max(0, this.ceiling - this.spent);
  }

  /** Check if estimated cost fits within remaining budget */
  canAfford(estimatedCost: number): boolean {
    return this.spent + estimatedCost <= this.ceiling;
  }

  /** Check if ceiling has been reached */
  isExhausted(): boolean {
    return this.spent >= this.ceiling;
  }
}
```

### Pattern 7: Benchmark Engine Orchestration
**What:** Main loop that iterates over selected models, runs each against all images with concurrency control, tracks cost, records results to database, and handles abort on cost ceiling.
**When to use:** Full benchmark execution flow.
**Confidence:** HIGH (composition of verified patterns)
```typescript
// lib/benchmark/engine.ts (simplified structure)
import pLimit from "p-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { CostTracker } from "./cost-tracker";
import { runModelOnce } from "./runner";
import { jsonMatch, fieldDiff } from "./json-compare";
import { getModelById } from "@/lib/config/models";
import { API_BUDGET_CEILING } from "@/lib/config/constants";

// Per-model concurrency: max 3 simultaneous calls to same model
const PER_MODEL_CONCURRENCY = 3;
// Global concurrency: max 10 simultaneous API calls total
const GLOBAL_CONCURRENCY = 10;

export async function runBenchmark(reportId: string): Promise<void> {
  const supabase = createAdminClient();
  const costTracker = new CostTracker(API_BUDGET_CEILING);
  const globalLimit = pLimit(GLOBAL_CONCURRENCY);

  // Update report status to running
  await supabase
    .from("reports")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", reportId);

  try {
    const { data: report } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!report) throw new Error("Report not found");

    const config = report.config_snapshot as any;
    const selectedModels = config.selected_models || [];
    const images = config.upload_data?.images || [];
    const expectedJsons = images.map((img: any) => JSON.parse(img.expectedJson));
    const imageUrls = images.map((img: any) => img.publicUrl);

    // Create per-model concurrency limiters
    const modelLimiters = new Map<string, ReturnType<typeof pLimit>>();
    for (const modelId of selectedModels) {
      modelLimiters.set(modelId, pLimit(PER_MODEL_CONCURRENCY));
    }

    // Build task list: each model x each image
    const tasks: Array<Promise<void>> = [];

    for (const modelId of selectedModels) {
      const model = getModelById(modelId);
      if (!model) continue;
      const modelLimit = modelLimiters.get(modelId)!;

      for (let imgIdx = 0; imgIdx < imageUrls.length; imgIdx++) {
        tasks.push(
          globalLimit(() =>
            modelLimit(async () => {
              // Check cost ceiling before making call
              if (costTracker.isExhausted()) return;

              const result = await runModelOnce(
                model,
                imageUrls[imgIdx],
                report.extraction_prompt,
                report.json_schema as Record<string, unknown>
              );

              // Track cost
              costTracker.addCost(result.cost);

              // Compare output to expected
              const passed = result.success
                ? jsonMatch(expectedJsons[imgIdx], result.parsedOutput)
                : false;
              const diffs = result.success && result.parsedOutput
                ? fieldDiff(
                    expectedJsons[imgIdx] as Record<string, unknown>,
                    result.parsedOutput as Record<string, unknown>
                  )
                : [];

              // Store individual run result
              await supabase.from("benchmark_runs").insert({
                report_id: reportId,
                model_id: modelId,
                image_index: imgIdx,
                output_json: result.output,
                response_time_ms: Math.round(result.responseTimeMs),
                prompt_tokens: result.promptTokens,
                completion_tokens: result.completionTokens,
                total_tokens: result.totalTokens,
                cost: result.cost,
                passed,
                field_diffs: diffs,
                error: result.error || null,
              });
            })
          )
        );
      }
    }

    // Execute all tasks (concurrency controlled)
    await Promise.allSettled(tasks);

    // Finalize report
    await supabase
      .from("reports")
      .update({
        status: "complete",
        total_api_cost: costTracker.getSpent(),
        model_count: selectedModels.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    // Send report-ready email (via Resend)
    // ... (see email pattern)

  } catch (err) {
    console.error("Benchmark failed:", err);
    await supabase
      .from("reports")
      .update({
        status: "failed",
        total_api_cost: costTracker.getSpent(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", reportId);
  }
}
```

### Pattern 8: Supabase Admin Client (Service Role)
**What:** A server-only Supabase client using the service_role key that bypasses RLS. Used in webhook handlers and background tasks where there is no user session.
**When to use:** Webhook processing, benchmark engine, any server operation without a user auth context.
**Confidence:** HIGH (standard Supabase pattern)
```typescript
// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### Anti-Patterns to Avoid
- **Anti-pattern: Triggering benchmark execution from the Stripe success page.** The success page is client-side navigation. Users can close the tab, lose connection, or never reach the page. The Stripe webhook is the reliable trigger. Success page should only show a "processing" status by polling the report record.
- **Anti-pattern: Storing Stripe webhook secret in NEXT_PUBLIC_ env vars.** Webhook secrets are server-only. Use `STRIPE_WEBHOOK_SECRET` (no NEXT_PUBLIC_ prefix). Exposing it client-side allows forged webhook events.
- **Anti-pattern: Using `request.json()` instead of `request.text()` in the Stripe webhook handler.** Stripe signature verification requires the raw request body. `request.json()` parses and re-serializes, breaking the signature. Always use `request.text()`.
- **Anti-pattern: Waiting for benchmark completion before returning 200 to Stripe webhook.** Stripe expects a 2xx response within ~10 seconds. Benchmarks take minutes. Use `after()` or `waitUntil()` to run the benchmark after the response is sent. If Stripe times out, it retries the webhook, potentially causing duplicate processing.
- **Anti-pattern: Relying solely on OpenRouter's `usage.cost` for budget tracking.** While the API returns cost in responses, some models may not populate it or it may be delayed. Use a hybrid approach: track cost from the response when available, fall back to estimated cost (tokens * model price per token) as a safety net.
- **Anti-pattern: No idempotency check on webhook processing.** Stripe retries webhooks on failure. Without idempotency (checking if the session has already been processed), duplicate benchmarks and reports will be created. Use a unique constraint on `stripe_session_id` in the reports table.
- **Anti-pattern: Unlimited concurrent OpenRouter calls.** Hitting all 24 models simultaneously with 10 images each means 240 near-simultaneous API calls. This will trigger rate limits on most models. Use per-model concurrency limits (3-5) and a global limit (10-15).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment processing | Custom credit card form, PCI compliance | Stripe Checkout (hosted redirect) | PCI compliance is a legal requirement. Stripe handles it entirely with hosted checkout. Zero PCI scope for the application. |
| Webhook signature verification | Custom HMAC comparison | `stripe.webhooks.constructEvent()` | Handles timing-safe comparison, timestamp tolerance, signature versioning. Custom implementation risks replay attacks and timing attacks. |
| Email delivery | SMTP configuration, sendgrid raw API | Resend + React Email | Resend handles deliverability, DNS verification, bounce handling. React Email provides type-safe JSX templates. |
| Concurrency limiting | Custom promise queue with counters | p-limit | p-limit handles edge cases (rejection propagation, cleanup, pending count tracking). 80M+ weekly downloads. |
| Exponential backoff | Simple setTimeout retry loop | Custom with jitter + Retry-After | Simple retry loops without jitter cause thundering herd. Without Retry-After respect, you ignore the server's guidance. The ~30-line custom implementation above is targeted and tested. |

**Key insight:** Phase 2 is primarily integration and orchestration work -- Stripe API, OpenRouter API, Supabase persistence. The custom code should focus on business logic (benchmark scheduling, cost tracking, JSON comparison) and lean on battle-tested APIs for payment, email, and HTTP handling.

## Common Pitfalls

### Pitfall 1: Stripe Webhook Timeout Causing Duplicate Processing
**What goes wrong:** Benchmark engine runs inside the webhook handler. Stripe times out after ~10 seconds, marks delivery as failed, and retries. Each retry creates a new benchmark run. User gets charged once but 3 reports are created.
**Why it happens:** Webhook handlers must respond quickly. Long-running work blocks the response.
**How to avoid:** (1) Return 200 immediately after validating the event and creating the report record. (2) Use Next.js `after()` to defer benchmark execution. (3) Add idempotency check (stripe_session_id unique constraint + check before insert).
**Warning signs:** Multiple report records for the same draft. Stripe webhook dashboard shows repeated deliveries with timeout errors.

### Pitfall 2: OpenRouter Rate Limits on Free/Budget Models
**What goes wrong:** Free models (`:free` suffix) have strict per-minute rate limits. Budget models on shared infrastructure also have lower limits. Benchmarking 4 free models with 10 images each at 3 runs per model means 120 calls to rate-limited endpoints. Mass 429 errors.
**Why it happens:** OpenRouter governs rate limits globally per model, not per API key. Free models have especially low limits. Account credits affect free model rate limits.
**How to avoid:** (1) Per-model concurrency limit of 2-3 for free/budget models. (2) Exponential backoff with jitter on 429. (3) Respect Retry-After header. (4) Consider sequential processing for free models (concurrency 1). (5) Pre-purchase OpenRouter credits to increase free model rate limits.
**Warning signs:** Batch of 429 errors for specific models. Free models taking 10x longer than paid models. Benchmark runs completing with mostly errors for free tier.

### Pitfall 3: Cost Ceiling Exceeded Due to Race Condition
**What goes wrong:** Multiple concurrent API calls complete simultaneously. Each reports $0.50 cost. Total goes from $6.00 to $8.50, exceeding the $7.00 ceiling, because all calls checked the budget before any reported their cost.
**Why it happens:** Cost tracking is atomic per-add but not per-check-and-execute. With concurrency, there is a window between "can I afford this?" and "recording the cost."
**How to avoid:** (1) Estimate cost before each call using model pricing (not just after from response). (2) Reserve the estimated cost before making the call, then adjust after response. (3) Accept that the ceiling is soft -- actual spend may be ~10% over due to concurrent in-flight calls. Set internal ceiling at $6.50 to leave buffer for in-flight calls. (4) After each cost addition, check ceiling and signal abort to remaining tasks.
**Warning signs:** Reports consistently exceed budget by 5-15%. Large premium model calls pushing total over budget in the final batch.

### Pitfall 4: OpenRouter Response Does Not Include `usage.cost`
**What goes wrong:** Some models or providers on OpenRouter do not populate the `cost` field in the response `usage` object. Cost tracker reads `0` and believes the call was free. Budget ceiling never triggers. Actual spend exceeds $7.
**Why it happens:** The `cost` field is not guaranteed by all providers routed through OpenRouter. Some return only token counts.
**How to avoid:** (1) Always calculate cost from token counts and model pricing as the primary tracking method: `cost = (prompt_tokens * inputCostPer1M / 1_000_000) + (completion_tokens * outputCostPer1M / 1_000_000)`. (2) Use `usage.cost` from the response as a verification/audit value, not the primary tracking mechanism. (3) The curated model list already has pricing data -- use it.
**Warning signs:** Cost tracker showing $0 spent after multiple calls. Reports showing $0 total_api_cost despite successful runs.

### Pitfall 5: Benchmark Exceeds 800s Vercel Fluid Compute Limit
**What goes wrong:** With 24 models x 10 images x 3 runs = 720 API calls, some with rate limiting backoff, the total execution time exceeds 800 seconds. Function is killed mid-execution. Report left in "running" status permanently.
**Why it happens:** Vercel Fluid Compute Pro plan has an absolute maximum of 800 seconds. Free models with rate limiting can dramatically increase execution time.
**How to avoid:** (1) Set `maxDuration` to 800 in the route handler config. (2) Track elapsed time and implement graceful shutdown: if approaching 750s, stop queuing new calls, wait for in-flight to finish, mark report as partial. (3) Consider reducing max models or max images to keep within time budget. (4) Free models should run with lower concurrency but are excluded from time-critical path if timing is tight.
**Warning signs:** Reports stuck in "running" status. Vercel function logs showing SIGTERM. Benchmarks completing for some models but not all.

### Pitfall 6: Stripe Webhook Not Reaching Local Development
**What goes wrong:** Payment completes on Stripe, user is redirected to success page, but webhook never fires. No report is created. No benchmark runs.
**Why it happens:** Stripe cannot reach localhost. Webhook URL must be publicly accessible.
**How to avoid:** (1) Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. (2) Set `STRIPE_WEBHOOK_SECRET` to the CLI-provided secret (different from dashboard secret). (3) Add the CLI forwarding command to development setup docs.
**Warning signs:** Payment succeeds (money charged) but no database records created. Success page shows "processing" indefinitely.

### Pitfall 7: Base64 Image Encoding Bloating Request Size
**What goes wrong:** Sending images as base64 to OpenRouter increases request payload by ~33%. A 5MB image becomes ~6.7MB of base64 text per API call. Multiplied across models and runs, this means gigabytes of upload bandwidth.
**Why it happens:** Base64 encoding is inherently 33% larger than binary. Most vision APIs accept URLs, making base64 unnecessary for public images.
**How to avoid:** (1) Images are already in Supabase Storage with public URLs. Pass the public URL directly to OpenRouter. (2) Only use base64 if images are private and URLs are not accessible. (3) Since the storage bucket is public (set in 002_storage_policies.sql), public URLs work.
**Warning signs:** API calls taking 10+ seconds due to large payloads. OpenRouter returning payload-too-large errors.

## Code Examples

### Stripe Server Client
```typescript
// lib/stripe/client.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
```

### Stripe Checkout Session Configuration
```typescript
// For one-time $14.99 payment with inline pricing (no pre-created Price object needed)
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  customer_email: user.email,
  client_reference_id: draftId,
  metadata: { draft_id: draftId, user_id: user.id },
  line_items: [{
    price_data: {
      currency: "usd",
      unit_amount: 1499,
      product_data: {
        name: "ModelPick Benchmark Report",
        description: `Benchmark ${modelCount} vision models on ${imageCount} images`,
      },
    },
    quantity: 1,
  }],
  success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/benchmark/new?draft=${draftId}`,
});
```

### Route Handler maxDuration Configuration
```typescript
// app/api/webhooks/stripe/route.ts
// Set max duration for Fluid Compute (benchmark runs in after())
export const maxDuration = 800; // seconds (Pro plan max)

export async function POST(request: Request) {
  // ... webhook handler
}
```

### OpenRouter Vision Call with Image URL
```typescript
// Sending image via public URL (preferred over base64)
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://modelpick.ai",
    "X-Title": "ModelPick",
  },
  body: JSON.stringify({
    model: "google/gemini-2.0-flash-001",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Extract structured data from this receipt..." },
        { type: "image_url", image_url: { url: "https://xyz.supabase.co/storage/v1/object/public/benchmark-images/..." } },
      ],
    }],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 4096,
  }),
});

const data = await response.json();
// data.choices[0].message.content -- JSON string
// data.usage.prompt_tokens, data.usage.completion_tokens, data.usage.cost
```

### Report Completion Email (Resend + React Email)
```typescript
// lib/email/send-report-ready.ts
import { Resend } from "resend";
import { ReportReadyEmail } from "@/emails/report-ready";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReportReadyEmail(
  userEmail: string,
  reportId: string,
  shareToken: string,
  topModel: string,
  accuracy: number
) {
  const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/report/${shareToken}`;

  await resend.emails.send({
    from: "ModelPick <noreply@modelpick.ai>",
    to: userEmail,
    subject: `Your benchmark report is ready - ${topModel} won at ${accuracy}%`,
    react: ReportReadyEmail({ reportUrl, topModel, accuracy }),
  });
}
```

### Phase 2 Database Migration
```sql
-- supabase/migrations/003_benchmark_runs.sql

-- Add stripe_session_id to reports for webhook idempotency
ALTER TABLE reports ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE;

-- Individual benchmark run results
CREATE TABLE benchmark_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  image_index INT NOT NULL,

  -- Model output
  output_json TEXT,                   -- Raw JSON string from model
  response_time_ms INT NOT NULL,      -- Wall-clock response time
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cost NUMERIC(10,6) NOT NULL DEFAULT 0,

  -- Comparison results
  passed BOOLEAN NOT NULL DEFAULT false,
  field_diffs JSONB DEFAULT '[]',     -- Array of { path, expected, actual }
  error TEXT,                          -- Error message if run failed

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_benchmark_runs_report ON benchmark_runs(report_id);
CREATE INDEX idx_benchmark_runs_model ON benchmark_runs(report_id, model_id);

-- RLS
ALTER TABLE benchmark_runs ENABLE ROW LEVEL SECURITY;

-- Runs inherit access from their parent report
-- Users can view runs for reports they own
CREATE POLICY "Users can view own benchmark runs"
  ON benchmark_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = benchmark_runs.report_id
      AND reports.user_id = (SELECT auth.uid())
    )
  );

-- Public can view runs for shared reports
CREATE POLICY "Anyone can view shared benchmark runs"
  ON benchmark_runs FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = benchmark_runs.report_id
      AND reports.share_token IS NOT NULL
    )
  );

-- Only service role (admin) can insert/update runs (benchmark engine)
-- No insert/update policies for authenticated users needed --
-- the benchmark engine uses the service role client.

-- Update reports table to allow service role updates
CREATE POLICY "Service role can update reports"
  ON reports FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert benchmark runs"
  ON benchmark_runs FOR INSERT
  TO service_role
  WITH CHECK (true);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Elements (embedded form) | Stripe Checkout (hosted redirect) | 2023+ | Hosted checkout handles PCI compliance, 3D Secure, Apple Pay, Google Pay automatically. Zero PCI scope. |
| Custom webhook retry handling | Stripe automatic retries (3 days, exponential backoff) | Stable | No need to build retry infra. Stripe retries up to 3 days with exponential backoff. Handle idempotency instead. |
| waitUntil (Vercel-specific) | after() (Next.js native, stable since 15.1) | Next.js 15.1 | after() is framework-native, works on Vercel and self-hosted. Backed by waitUntil on Vercel. Preferred over direct waitUntil. |
| Edge Functions for background tasks | Vercel Fluid Compute + after() | 2025 | Fluid Compute allows 800s execution with shared concurrency. No separate Edge Function deployment needed. |
| Manual email SMTP | Resend + React Email | 2024+ | Type-safe JSX email templates, built-in deliverability, free tier for MVP volume. |
| Serverless per-request isolation | Fluid Compute shared instances + concurrency | 2025 | Multiple invocations share function instance. Reduces cold starts, better for high-throughput benchmark workloads. |

**Deprecated/outdated:**
- `@stripe/stripe-js` for checkout: Not needed for hosted redirect flow. Only needed for Stripe Elements (embedded forms).
- `unstable_after`: Renamed to `after` in Next.js 15.1. Import from `next/server`.
- Direct `waitUntil` from `@vercel/functions`: Still works but `after()` from `next/server` is preferred for Next.js apps.

## Open Questions

1. **OpenRouter `usage.cost` reliability across all 25 models**
   - What we know: OpenRouter returns `cost` in the usage object for many models. The documentation says cost is included in responses.
   - What's unclear: Whether all 25 curated models consistently return the `cost` field, or if some providers omit it.
   - Recommendation: Use calculated cost (tokens * model pricing) as the primary tracking mechanism. Use `usage.cost` as a verification/audit value. This is a safer approach that does not depend on provider behavior.

2. **Vercel Fluid Compute 800s sufficiency for large benchmarks**
   - What we know: 24 models x 10 images x 3 runs = 720 calls. At ~3s per call with 10 concurrent, that is ~216s plus overhead. But rate limiting on free models can add substantial delay.
   - What's unclear: Real-world execution time with rate limiting backoff on free/budget models.
   - Recommendation: Start with 800s limit. Track execution times in production. If consistently hitting the limit, implement graceful partial completion (mark report as "partial" with completed model results) and consider deferring to an external job queue (Inngest/Trigger.dev) as a Phase 2.1 enhancement.

3. **OpenRouter rate limits for concurrent benchmarking across many models**
   - What we know: Rate limits are governed globally per model, not per API key. Free models have low RPM limits. Credit balance affects free model limits.
   - What's unclear: Exact per-model RPM limits for paid models. Whether benchmarking all 24 models simultaneously triggers account-level throttling.
   - Recommendation: Start conservatively with per-model concurrency of 3 and global concurrency of 10. Monitor 429 rates in production. Increase limits for models that consistently succeed and decrease for models that consistently rate-limit.

4. **Stripe Checkout email receipt vs custom email with report link**
   - What we know: Stripe can send automatic payment receipts when enabled in dashboard settings. PAY-03 requires "email receipt with report link." Stripe receipt does not include a report link.
   - What's unclear: Whether "email receipt with report link" means (a) Stripe payment receipt + separate report-ready email, or (b) a single custom email combining receipt and report link.
   - Recommendation: Enable Stripe automatic receipts for payment confirmation (happens immediately). Send a separate Resend email with the report link when the benchmark completes. Two emails: one for payment, one for results. This is simpler and decouples payment confirmation from benchmark completion.

5. **Whether `after()` inherits the maxDuration of the route handler**
   - What we know: Next.js docs say `after` runs for "the platform's default or configured max duration of your route." On Vercel, this is backed by `waitUntil` which extends the function lifetime.
   - What's unclear: Whether setting `maxDuration = 800` on the webhook route handler gives `after()` the full 800s, or if the `after()` callback has its own separate limit.
   - Recommendation: Set `maxDuration = 800` on the webhook route. Test in staging with a long-running benchmark. If `after()` is killed early, move benchmark execution to a dedicated route handler that the webhook calls via an internal HTTP request.

## Sources

### Primary (HIGH confidence)
- [Stripe Checkout Quickstart (Next.js)](https://docs.stripe.com/checkout/quickstart?client=next) - Session creation, redirect flow, success page pattern
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) - Signature verification, idempotency, retry behavior, best practices
- [Stripe Checkout Session Create API](https://docs.stripe.com/api/checkout/sessions/create) - Parameters: mode, line_items, price_data, metadata, client_reference_id
- [Stripe Email Receipts](https://docs.stripe.com/payments/checkout/receipts) - Automatic receipt configuration
- [OpenRouter Chat Completions API](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request) - Request/response schema, vision input format, usage data
- [OpenRouter Image Inputs](https://openrouter.ai/docs/guides/overview/multimodal/images) - URL and base64 image formats, supported types (PNG, JPEG, WebP, GIF)
- [OpenRouter Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs) - response_format json_object/json_schema modes
- [OpenRouter Usage Accounting](https://openrouter.ai/docs/guides/guides/usage-accounting) - Per-request cost in usage object, /api/v1/generation endpoint
- [OpenRouter Rate Limits](https://openrouter.ai/docs/api/reference/limits) - Global rate governance, free model limits, credit-based limits
- [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute) - 800s Pro max duration, waitUntil, optimized concurrency, default settings
- [Next.js after() Function](https://nextjs.org/docs/app/api-reference/functions/after) - Background execution after response, maxDuration inheritance, platform support
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785) - JCS specification for deterministic JSON serialization

### Secondary (MEDIUM confidence)
- [Stripe + Next.js Complete Guide (pedroalonso.net)](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) - App Router webhook pattern with request.text()
- [Next.js App Router Stripe Webhook Signature (Medium)](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) - request.text() for raw body, headers() for signature
- [Vercel + Stripe Starter (Vercel KB)](https://vercel.com/kb/guide/getting-started-with-nextjs-typescript-stripe) - Vercel-recommended patterns
- [p-limit npm](https://www.npmjs.com/package/p-limit) - v7.2.0, ESM, TypeScript, 80M+ weekly downloads
- [Resend + Next.js](https://resend.com/docs/send-with-nextjs) - Email integration with React Email templates
- [json-canonicalize npm](https://www.npmjs.com/package/json-canonicalize) - RFC 8785 implementation reference
- [canonical-json (GitHub)](https://github.com/mirkokiefer/canonical-json) - Alternative canonicalization approach

### Tertiary (LOW confidence)
- [Supabase Edge Functions Background Tasks](https://supabase.com/docs/guides/functions/background-tasks) - 400s wall clock limit (not used, but evaluated as alternative to Vercel Fluid Compute)
- [OpenRouter Pricing](https://openrouter.ai/pricing) - Credit-based pricing, per-token rates (may change)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Stripe, OpenRouter, p-limit, Resend all verified via official docs with current versions
- Architecture: HIGH - Webhook-driven execution with after() is officially documented by Next.js and Vercel. Fluid Compute 800s limit verified. OpenRouter API schema verified.
- Pitfalls: HIGH - Webhook timeout, rate limiting, cost ceiling race conditions, and idempotency are well-documented failure modes with clear prevention strategies
- JSON comparison: MEDIUM - Custom canonicalization is simpler than RFC 8785 but needs testing with real model outputs. Number normalization edge cases (scientific notation, precision) may surface.

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- Stripe and OpenRouter APIs are stable; Vercel Fluid Compute limits may change)
