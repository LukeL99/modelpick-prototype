/**
 * Transform raw benchmark_runs into aggregated ModelSummary[] for report display.
 *
 * All functions are pure -- they receive data as arguments, make no database
 * calls, and produce no side effects. Calculation logic mirrors engine.ts Step 5
 * for consistency.
 */

import type { BenchmarkRun, Report } from "@/types/database";
import type {
  ModelSummary,
  FieldErrorSummary,
  ReportData,
} from "@/types/report";
import { getModelById } from "@/lib/config/models";

/**
 * Transform raw benchmark runs and a report into the ReportData view model.
 *
 * Groups runs by model_id, calculates per-model aggregates (accuracy, cost,
 * latency, spread), looks up model metadata, and assembles the complete
 * ReportData object for rendering.
 */
export function transformRunsToReport(
  runs: BenchmarkRun[],
  report: Report
): ReportData {
  // Group runs by model_id
  const runsByModel = new Map<string, BenchmarkRun[]>();
  for (const run of runs) {
    const existing = runsByModel.get(run.model_id) ?? [];
    existing.push(run);
    runsByModel.set(run.model_id, existing);
  }

  // Calculate per-model summaries
  const models: ModelSummary[] = [];

  for (const [modelId, modelRuns] of runsByModel) {
    const completedRuns = modelRuns.filter((r) => r.status === "complete");
    const runsAttempted = modelRuns.length;
    const runsCompleted = completedRuns.length;

    // Look up model metadata, fall back to modelId/"unknown" if not in curated list
    const modelInfo = getModelById(modelId);
    const modelName = modelInfo?.name ?? modelId;
    const provider = modelInfo?.provider ?? "unknown";
    const tier = modelInfo?.tier ?? "unknown";

    if (runsCompleted === 0) {
      models.push({
        modelId,
        modelName,
        provider,
        tier,
        accuracy: 0,
        exactMatchRate: 0,
        costPerRun: 0,
        medianLatency: 0,
        p95Latency: 0,
        spread: 0,
        runsCompleted: 0,
        runsAttempted,
      });
      continue;
    }

    // Accuracy: average field_accuracy from completed runs (already 0-100 from engine)
    const accuracies = completedRuns
      .map((r) => r.field_accuracy ?? 0)
      .filter((a): a is number => typeof a === "number");
    const avgAccuracy =
      accuracies.length > 0
        ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
        : 0;

    // Exact match rate: % of completed runs with exact_match === true
    const exactMatches = completedRuns.filter((r) => r.exact_match).length;
    const exactMatchRate =
      runsCompleted > 0 ? (exactMatches / runsCompleted) * 100 : 0;

    // Cost per run: average actual_cost from completed runs
    const costs = completedRuns
      .map((r) => r.actual_cost ?? 0)
      .filter((c): c is number => typeof c === "number");
    const costPerRun =
      costs.length > 0
        ? costs.reduce((sum, c) => sum + c, 0) / costs.length
        : 0;

    // Latencies: sort for median and p95
    const latencies = completedRuns
      .map((r) => r.response_time_ms ?? 0)
      .filter((l): l is number => typeof l === "number" && l > 0)
      .sort((a, b) => a - b);

    const medianLatency =
      latencies.length > 0
        ? latencies[Math.floor(latencies.length / 2)]
        : 0;

    const p95Index = Math.min(
      Math.ceil(latencies.length * 0.95) - 1,
      latencies.length - 1
    );
    const p95Latency =
      latencies.length > 0 ? latencies[Math.max(0, p95Index)] : 0;

    // Spread: standard deviation of field_accuracy
    const mean = avgAccuracy;
    const squaredDiffs = accuracies.map((a) => Math.pow(a - mean, 2));
    const variance =
      squaredDiffs.length > 0
        ? squaredDiffs.reduce((sum, d) => sum + d, 0) / squaredDiffs.length
        : 0;
    const spread = Math.sqrt(variance);

    models.push({
      modelId,
      modelName,
      provider,
      tier,
      accuracy: Math.round(avgAccuracy * 100) / 100,
      exactMatchRate: Math.round(exactMatchRate * 100) / 100,
      costPerRun: Math.round(costPerRun * 1000000) / 1000000,
      medianLatency: Math.round(medianLatency),
      p95Latency: Math.round(p95Latency),
      spread: Math.round(spread * 100) / 100,
      runsCompleted,
      runsAttempted,
    });
  }

  // Sort models by accuracy descending as default order
  models.sort((a, b) => b.accuracy - a.accuracy);

  // Extract metadata from report and config_snapshot
  const configSnapshot = report.config_snapshot as Record<string, unknown>;
  const priorities = (configSnapshot?.priorities as string[]) ?? [];
  const imageCount =
    (configSnapshot?.imageCount as number) ??
    (report.image_paths?.length ?? 0);

  return {
    models,
    recommendedModelId: report.recommended_model,
    totalApiCost: report.total_api_cost ?? 0,
    rationale: "", // Populated by generateRationale() separately
    priorities,
    imageCount,
    modelCount: models.length,
    startedAt: report.started_at,
    completedAt: report.completed_at,
  };
}

/**
 * Aggregate field errors from completed runs for a single model.
 *
 * Groups by unique (fieldPath, expected, actual) tuples and counts occurrences.
 * Returns sorted by occurrences descending.
 */
export function getModelFieldErrors(
  runs: BenchmarkRun[]
): FieldErrorSummary[] {
  const completedRuns = runs.filter((r) => r.status === "complete");
  const totalRuns = completedRuns.length;

  if (totalRuns === 0) return [];

  // Group errors by (fieldPath, expected, actual)
  const errorMap = new Map<
    string,
    { fieldPath: string; expected: string; actual: string; occurrences: number }
  >();

  for (const run of completedRuns) {
    const errors = run.field_errors as Array<{
      fieldPath: string;
      expected: string;
      actual: string;
    }>;

    if (!Array.isArray(errors)) continue;

    for (const err of errors) {
      if (!err.fieldPath) continue;

      const key = `${err.fieldPath}|${String(err.expected)}|${String(err.actual)}`;
      const existing = errorMap.get(key);

      if (existing) {
        existing.occurrences++;
      } else {
        errorMap.set(key, {
          fieldPath: err.fieldPath,
          expected: String(err.expected ?? ""),
          actual: String(err.actual ?? ""),
          occurrences: 1,
        });
      }
    }
  }

  // Convert to array with percentages, sorted by occurrences descending
  return Array.from(errorMap.values())
    .map((entry) => ({
      ...entry,
      percentage: Math.round(((entry.occurrences / totalRuns) * 100) * 100) / 100,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}
