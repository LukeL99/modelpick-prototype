"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getModelById } from "@/lib/config/models";
import type { BenchmarkRun, BenchmarkRunStatus } from "@/types/database";

interface ModelProgress {
  modelId: string;
  modelName: string;
  completed: number;
  total: number;
  status: "pending" | "running" | "complete";
}

interface LiveProgressProps {
  reportId: string;
  selectedModelIds: string[];
  totalRunsPerModel: number;
  shareToken: string | null;
}

/**
 * Real-time benchmark progress panel.
 *
 * Subscribes to Supabase Realtime postgres_changes on benchmark_runs and reports
 * tables, showing per-model progress bars with connection status and auto-redirect
 * on completion.
 */
export function LiveProgress({
  reportId,
  selectedModelIds,
  totalRunsPerModel,
  shareToken,
}: LiveProgressProps) {
  const router = useRouter();

  // Per-model progress keyed by modelId
  const [progress, setProgress] = useState<Map<string, ModelProgress>>(
    () => {
      const initial = new Map<string, ModelProgress>();
      for (const modelId of selectedModelIds) {
        initial.set(modelId, {
          modelId,
          modelName: getModelById(modelId)?.name ?? modelId,
          completed: 0,
          total: totalRunsPerModel,
          status: "pending",
        });
      }
      return initial;
    }
  );

  const [connected, setConnected] = useState(false);
  const [reportComplete, setReportComplete] = useState(false);
  const [reportFailed, setReportFailed] = useState(false);

  // Track which run IDs we have already counted to avoid double-counting on UPDATE
  const [countedRunIds] = useState(() => new Set<string>());

  // Subscribe to Realtime postgres_changes on benchmark_runs and reports
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`benchmark-progress-${reportId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "benchmark_runs",
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          const run = payload.new as BenchmarkRun;
          if (!run || !run.model_id) return;

          const runStatus = run.status as BenchmarkRunStatus;
          const isTerminal =
            runStatus === "complete" ||
            runStatus === "failed" ||
            runStatus === "skipped";

          setProgress((prev) => {
            const next = new Map(prev);
            const existing = next.get(run.model_id);
            if (!existing) return prev;

            // Only count a run once -- track by run ID
            if (isTerminal && !countedRunIds.has(run.id)) {
              countedRunIds.add(run.id);
              const newCompleted = existing.completed + 1;
              const newStatus: ModelProgress["status"] =
                newCompleted >= existing.total ? "complete" : "running";

              next.set(run.model_id, {
                ...existing,
                completed: newCompleted,
                status: newStatus,
              });
            } else if (runStatus === "running" && existing.status === "pending") {
              next.set(run.model_id, {
                ...existing,
                status: "running",
              });
            }

            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reports",
          filter: `id=eq.${reportId}`,
        },
        (payload) => {
          const report = payload.new as { status?: string };
          if (report.status === "complete") {
            setReportComplete(true);
          } else if (report.status === "failed") {
            setReportFailed(true);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId, countedRunIds]);

  // Auto-redirect on completion
  useEffect(() => {
    if (!reportComplete) return;

    const timeout = setTimeout(() => {
      if (shareToken) {
        router.push(`/report/${shareToken}`);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [reportComplete, shareToken, router]);

  // Calculate overall progress
  const progressEntries = Array.from(progress.values());
  const totalCompleted = progressEntries.reduce(
    (sum, m) => sum + m.completed,
    0
  );
  const totalRuns = progressEntries.reduce((sum, m) => sum + m.total, 0);
  const overallPercent = totalRuns > 0 ? (totalCompleted / totalRuns) * 100 : 0;

  return (
    <div className="w-full space-y-5">
      {/* Connection status */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connected
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
              : "bg-yellow-400 animate-pulse"
          }`}
        />
        <span className={connected ? "text-text-secondary" : "text-yellow-400"}>
          {connected ? "Live" : "Reconnecting..."}
        </span>
      </div>

      {/* Report failed state */}
      {reportFailed && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-sm font-medium text-red-400">
            Benchmark failed. Please try again.
          </p>
          <a
            href="/dashboard"
            className="mt-2 inline-block text-xs text-text-muted underline hover:text-text-secondary"
          >
            Back to dashboard
          </a>
        </div>
      )}

      {/* Report complete state */}
      {reportComplete && !reportFailed && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <p className="text-sm font-medium text-emerald-400">
            Benchmark complete!
          </p>
          {shareToken ? (
            <p className="mt-1 text-xs text-text-muted">
              Redirecting to your report...
            </p>
          ) : (
            <a
              href="/dashboard"
              className="mt-2 inline-block text-xs text-text-muted underline hover:text-text-secondary"
            >
              View report from dashboard
            </a>
          )}
        </div>
      )}

      {/* Overall progress bar */}
      {!reportFailed && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Overall progress</span>
              <span className="tabular-nums">
                {totalCompleted}/{totalRuns} runs
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-ember transition-all duration-500 ease-out"
                style={{ width: `${Math.min(overallPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Per-model rows */}
          <div className="space-y-3">
            {progressEntries.map((model) => {
              const percent =
                model.total > 0
                  ? (model.completed / model.total) * 100
                  : 0;

              return (
                <div
                  key={model.modelId}
                  className="rounded-lg border border-surface-border bg-surface p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm font-medium text-text-primary">
                        {model.modelName}
                      </span>
                      <StatusBadge status={model.status} />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-text-muted">
                      {model.completed}/{model.total} runs
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        model.status === "complete"
                          ? "bg-emerald-400"
                          : "bg-ember"
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ModelProgress["status"] }) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-surface-border/50 text-text-muted">
          Waiting
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-ember/20 text-ember animate-pulse">
          Running
        </span>
      );
    case "complete":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-400/20 text-emerald-400">
          Complete
        </span>
      );
    default:
      return null;
  }
}
