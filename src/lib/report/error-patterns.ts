/**
 * Aggregate field errors into cross-model patterns.
 *
 * Shows which fields each model misses most, enabling the report UI to
 * display error heatmaps and per-model weakness analysis.
 *
 * All functions are pure -- no side effects, no database calls.
 */

import type { ModelSummary, ErrorPattern } from "@/types/report";
import type { BenchmarkRun } from "@/types/database";

/**
 * Aggregate field errors into patterns grouped by (modelId, fieldPath).
 *
 * For each model, iterates completed runs, extracts field_errors, groups
 * by fieldPath, and finds the most common incorrect value. Patterns with
 * less than 10% occurrence rate are filtered out (rare one-off errors).
 *
 * Returns sorted by occurrences descending, then by percentage descending.
 */
export function aggregateErrorPatterns(
  models: ModelSummary[],
  runsByModel: Map<string, BenchmarkRun[]>
): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];

  for (const model of models) {
    const runs = runsByModel.get(model.modelId);
    if (!runs) continue;

    const completedRuns = runs.filter((r) => r.status === "complete");
    const totalRuns = completedRuns.length;
    if (totalRuns === 0) continue;

    // Group errors by fieldPath for this model
    // Track: { fieldPath -> { occurrences, actualValues -> count } }
    const fieldMap = new Map<
      string,
      {
        occurrences: number;
        expectedValues: Map<string, number>;
        actualValues: Map<string, number>;
      }
    >();

    for (const run of completedRuns) {
      const errors = run.field_errors as Array<{
        fieldPath: string;
        expected: string;
        actual: string;
      }>;

      if (!Array.isArray(errors)) continue;

      // Track unique fieldPaths per run (don't double-count the same field in one run)
      const seenFields = new Set<string>();

      for (const err of errors) {
        if (!err.fieldPath) continue;

        const fieldPath = err.fieldPath;

        if (!seenFields.has(fieldPath)) {
          seenFields.add(fieldPath);
          const existing = fieldMap.get(fieldPath);
          if (existing) {
            existing.occurrences++;
          } else {
            fieldMap.set(fieldPath, {
              occurrences: 1,
              expectedValues: new Map(),
              actualValues: new Map(),
            });
          }
        }

        // Always track expected/actual values for frequency analysis
        const entry = fieldMap.get(fieldPath)!;

        const expectedStr = String(err.expected ?? "");
        entry.expectedValues.set(
          expectedStr,
          (entry.expectedValues.get(expectedStr) ?? 0) + 1
        );

        const actualStr = String(err.actual ?? "");
        entry.actualValues.set(
          actualStr,
          (entry.actualValues.get(actualStr) ?? 0) + 1
        );
      }
    }

    // Convert fieldMap entries to ErrorPattern objects
    for (const [fieldPath, data] of fieldMap) {
      const percentage = (data.occurrences / totalRuns) * 100;

      // Filter out rare one-off errors (< 10% occurrence)
      if (percentage < 10) continue;

      // Find most common expected value
      let commonExpected = "";
      let maxExpectedCount = 0;
      for (const [val, count] of data.expectedValues) {
        if (count > maxExpectedCount) {
          maxExpectedCount = count;
          commonExpected = val;
        }
      }

      // Find most common actual (incorrect) value
      let commonActual = "";
      let maxActualCount = 0;
      for (const [val, count] of data.actualValues) {
        if (count > maxActualCount) {
          maxActualCount = count;
          commonActual = val;
        }
      }

      patterns.push({
        modelName: model.modelName,
        modelId: model.modelId,
        fieldPath,
        occurrences: data.occurrences,
        totalRuns,
        percentage: Math.round(percentage * 100) / 100,
        commonExpected,
        commonActual,
      });
    }
  }

  // Sort by occurrences descending, then by percentage descending
  patterns.sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return b.percentage - a.percentage;
  });

  return patterns;
}
