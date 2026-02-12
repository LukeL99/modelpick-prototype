-- Migration 004: Enable Supabase Realtime and anonymous benchmark_runs access
--
-- This supplements migration 003 (benchmark_runs) which only granted
-- authenticated-user policies. Here we:
--   1. Add benchmark_runs and reports to supabase_realtime publication
--      so Realtime postgres_changes events fire for live progress updates.
--   2. Grant anonymous SELECT on benchmark_runs for shared report links,
--      so visitors to /report/[token] can see run data without logging in.

-- ── 1. Enable Realtime replication ──────────────────────────────────────────
-- Required for Supabase Realtime postgres_changes to fire on INSERT/UPDATE.
-- Default REPLICA IDENTITY (primary key) is sufficient -- we only need the
-- `new` row, not the `old` row.

ALTER PUBLICATION supabase_realtime ADD TABLE benchmark_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE reports;

-- ── 2. Anonymous SELECT policy for shared reports ───────────────────────────
-- Without this, anonymous visitors can see the report row (via existing anon
-- policy on reports) but NOT the benchmark_runs data. The subquery checks
-- that the parent report has a non-null share_token, meaning it was
-- explicitly shared.

CREATE POLICY "Anyone can view runs for shared reports"
  ON benchmark_runs FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = benchmark_runs.report_id
      AND reports.share_token IS NOT NULL
    )
  );
