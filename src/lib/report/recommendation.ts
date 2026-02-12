/**
 * Generate human-readable recommendation rationale text.
 *
 * Pure function -- no side effects, no database calls.
 */

import type { ModelSummary } from "@/types/report";

/**
 * Generate a rationale string explaining why a model was recommended.
 *
 * Builds the rationale based on the user's top priority:
 * - accuracy: highlights field accuracy percentage
 * - speed: highlights median response time
 * - cost: highlights cost per call
 *
 * Adds cost savings comparison vs most expensive model when savings > 10%.
 * Adds consistency note when spread < 5.
 */
export function generateRationale(
  recommended: ModelSummary,
  allModels: ModelSummary[],
  priorities: string[]
): string {
  const name = recommended.modelName;
  const parts: string[] = [];

  // Build primary rationale based on top priority
  const topPriority = priorities[0] ?? "accuracy";

  switch (topPriority) {
    case "accuracy":
      parts.push(
        `${name} achieved ${recommended.accuracy}% field accuracy`
      );
      break;
    case "speed":
      parts.push(
        `${name} responded in ${recommended.medianLatency}ms median`
      );
      break;
    case "cost":
      parts.push(
        `${name} costs $${recommended.costPerRun.toFixed(6)}/call`
      );
      break;
    default:
      parts.push(
        `${name} achieved ${recommended.accuracy}% field accuracy`
      );
  }

  // Add cost savings comparison vs most expensive model if savings > 10%
  const modelsWithCost = allModels.filter((m) => m.costPerRun > 0);
  if (modelsWithCost.length > 1) {
    const mostExpensive = modelsWithCost.reduce((max, m) =>
      m.costPerRun > max.costPerRun ? m : max
    );

    if (
      mostExpensive.modelId !== recommended.modelId &&
      mostExpensive.costPerRun > 0
    ) {
      const savings =
        ((mostExpensive.costPerRun - recommended.costPerRun) /
          mostExpensive.costPerRun) *
        100;

      if (savings > 10) {
        parts.push(
          `${Math.round(savings)}% cheaper than ${mostExpensive.modelName}`
        );
      }
    }
  }

  // Add consistency note if spread < 5
  if (recommended.spread < 5) {
    parts.push(
      `with consistent results (\u00b1${recommended.spread}%)`
    );
  }

  return parts.join(", ") + ".";
}
