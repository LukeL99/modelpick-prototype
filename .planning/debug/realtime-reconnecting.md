---
status: diagnosed
trigger: "Processing page shows Reconnecting badge, no running models in mock mode"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Root Cause

There are **three compounding issues**, ranked by severity:

### Issue 1 (PRIMARY): Mock checkout never starts the benchmark engine

The mock Stripe checkout path in `/api/checkout/route.ts` creates the report
record with status `"paid"` and returns `{ reportId }` to the client, but
**never invokes `runBenchmark()`**. The real Stripe flow triggers it from the
webhook handler via `after()`:

```ts
// src/app/api/webhooks/stripe/route.ts  (lines 163-170)
after(async () => {
  const { runBenchmark } = await import("@/lib/benchmark/engine");
  await runBenchmark(report.id);
});
```

But the mock path in `/api/checkout/route.ts` (lines 119-169) simply inserts
the report and returns -- no benchmark engine call:

```ts
// src/app/api/checkout/route.ts  (line 169)
return NextResponse.json({ reportId: report.id });
// <-- missing: runBenchmark(report.id)
```

**Consequence:** In mock mode, the report sits at status `"paid"` forever.
Zero `benchmark_runs` rows are inserted. The LiveProgress component subscribes
to Realtime changes on `benchmark_runs` filtered by `report_id`, but no rows
ever arrive. The report status never transitions to `"running"` or `"complete"`.

This is why no running models appear -- there are literally no benchmark runs
being executed.

### Issue 2 (SECONDARY): "Reconnecting" status is likely a legitimate Realtime connection issue

The LiveProgress component shows "Reconnecting" (yellow badge) when the
Supabase Realtime channel subscription callback receives any status other than
`"SUBSCRIBED"`:

```ts
// src/components/benchmark/live-progress.tsx  (lines 132-134)
.subscribe((status) => {
  setConnected(status === "SUBSCRIBED");
});
```

The Realtime subscription targets both `benchmark_runs` and `reports` tables
with RLS-filtered `postgres_changes`. For the subscription to succeed, two
conditions must be met:

1. **Migration 004 must be applied** -- `ALTER PUBLICATION supabase_realtime ADD TABLE benchmark_runs` and `reports` must have been executed on the hosted Supabase project.

2. **RLS must permit the subscription** -- The authenticated user's Realtime
   subscription is subject to RLS. The `benchmark_runs` SELECT policy requires
   the report's `user_id` to match `auth.uid()`, which should work for the
   owner. However, if the migration was never applied to the hosted project (at
   `ghcwiwznhetkgjzfmbkm.supabase.co`), the publication won't include these
   tables and Realtime events will never fire, causing the channel to fail to
   reach `SUBSCRIBED` status.

**Recommendation:** Verify that migration 004 has been applied to the hosted
Supabase project. Check the Supabase Dashboard > Database > Publications >
`supabase_realtime` and confirm both `benchmark_runs` and `reports` are listed.
Alternatively, check via SQL: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`

Note: Even if the migration IS applied, the Realtime channel may still connect
successfully and show "Live" -- but with Issue 1, there would be no events to
receive.

### Issue 3 (SECONDARY): Mock runner env var mismatch

Even if Issue 1 were fixed (benchmark engine invoked in mock checkout), the
runner's mock detection would fail:

```ts
// src/lib/benchmark/runner.ts  (lines 53-58)
export function isMockOpenRouter(): boolean {
  return (
    process.env.NEXT_PUBLIC_MOCK_OPENROUTER === "true" ||
    process.env.NEXT_PUBLIC_MOCK_OPENROUTER === "1"
  );
}
```

But `.env.local` uses a different variable name:

```env
DEBUG_MOCK_OPENROUTER=true
```

The canonical mock config in `src/lib/debug/mock-config.ts` correctly checks
`DEBUG_MOCK_OPENROUTER`:

```ts
export function isMockOpenRouter(): boolean {
  return process.env.DEBUG_MOCK_OPENROUTER === "true";
}
```

The runner defines its own `isMockOpenRouter()` that checks the wrong env var
(`NEXT_PUBLIC_MOCK_OPENROUTER`). This function would return `false`, causing
the runner to attempt real OpenRouter API calls with the placeholder key
`sk-or-...`, which would fail with auth errors for every run.

## Affected Files and Lines

| File | Lines | Issue |
|------|-------|-------|
| `src/app/api/checkout/route.ts` | 119-169 | Mock checkout path never calls `runBenchmark()` |
| `src/lib/benchmark/runner.ts` | 53-58 | Checks `NEXT_PUBLIC_MOCK_OPENROUTER` instead of `DEBUG_MOCK_OPENROUTER` |
| `src/components/benchmark/live-progress.tsx` | 132-134 | Correctly implemented but shows "Reconnecting" when channel fails to subscribe |
| `supabase/migrations/004_realtime_and_shared_runs.sql` | 15-16 | Must be verified as applied to hosted project |

## Recommended Fix

### Fix 1: Add `runBenchmark()` call to mock checkout path

In `src/app/api/checkout/route.ts`, after creating the mock report (around line
168), add the same `after()` call used in the webhook route:

```ts
// After: await admin.from("benchmark_drafts").update(...)
// Before: return NextResponse.json({ reportId: report.id });

// Trigger benchmark engine (same as webhook route)
const { after } = await import("next/server");
after(async () => {
  try {
    const { runBenchmark } = await import("@/lib/benchmark/engine");
    await runBenchmark(report.id);
  } catch (err) {
    console.error("[checkout:mock] Benchmark engine error:", err);
  }
});
```

Note: `after()` is already imported at the top of the webhook route. For the
checkout route, it needs to be imported (it's a Next.js 15 API).

### Fix 2: Fix runner mock env var

In `src/lib/benchmark/runner.ts`, replace the local `isMockOpenRouter()`
function with an import from the canonical mock config:

```ts
// Remove local isMockOpenRouter function (lines 52-58)
// Add import:
import { isMockOpenRouter } from "@/lib/debug/mock-config";
```

Or, at minimum, change line 55 to check `DEBUG_MOCK_OPENROUTER`:

```ts
process.env.DEBUG_MOCK_OPENROUTER === "true"
```

### Fix 3: Verify Realtime publication

Confirm migration 004 was applied. If not, run it manually or via Supabase CLI:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE benchmark_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
```

## Evidence

- `src/app/api/checkout/route.ts` line 169: mock path returns without calling
  `runBenchmark` -- grep confirms `runBenchmark` is only called from
  `src/app/api/webhooks/stripe/route.ts`
- `src/lib/benchmark/runner.ts` line 55: checks `NEXT_PUBLIC_MOCK_OPENROUTER`
- `.env.local` line 20: sets `DEBUG_MOCK_OPENROUTER=true` (different name)
- `src/lib/debug/mock-config.ts` line 13: canonical check uses `DEBUG_MOCK_OPENROUTER`
- `src/components/benchmark/live-progress.tsx` line 133: shows "Live" only when
  status is exactly `"SUBSCRIBED"`
- `src/components/wizard/confirmation-screen.tsx` lines 56-58: mock mode
  navigates to `/benchmark/${data.reportId}/processing` after checkout
