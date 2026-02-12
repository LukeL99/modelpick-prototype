/**
 * Report view model types used by all Phase 3 report UI components.
 *
 * These are the transformed/aggregated shapes that report pages consume,
 * derived from raw BenchmarkRun rows via the report data layer.
 */

/** Aggregated summary for a single model across all its benchmark runs */
export interface ModelSummary {
  modelId: string;
  modelName: string;
  provider: string;
  tier: string;
  accuracy: number; // avg field_accuracy as percentage (0-100)
  exactMatchRate: number; // % of runs with exact_match (0-100)
  costPerRun: number; // avg actual_cost in USD
  medianLatency: number; // median response_time_ms
  p95Latency: number; // 95th percentile response_time_ms
  spread: number; // std dev of field_accuracy
  runsCompleted: number;
  runsAttempted: number;
}

/** A unique (fieldPath, expected, actual) error group with occurrence count */
export interface FieldErrorSummary {
  fieldPath: string;
  expected: string;
  actual: string;
  occurrences: number;
  percentage: number; // occurrences / totalRuns * 100
}

/** Cross-model error pattern: which fields each model misses most */
export interface ErrorPattern {
  modelName: string;
  modelId: string;
  fieldPath: string;
  occurrences: number;
  totalRuns: number;
  percentage: number;
  commonExpected: string;
  commonActual: string; // most frequent incorrect value
}

/** Complete report data consumed by the report page and its components */
export interface ReportData {
  models: ModelSummary[];
  recommendedModelId: string | null;
  totalApiCost: number;
  rationale: string;
  priorities: string[];
  imageCount: number;
  modelCount: number;
  startedAt: string | null;
  completedAt: string | null;
}
