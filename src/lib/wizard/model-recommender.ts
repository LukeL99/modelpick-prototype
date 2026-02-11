/**
 * Model recommendation engine.
 * Selects models based on user priorities and strategy,
 * then optimizes runs-per-model within the API budget ceiling.
 */
import type { ModelInfo, ModelTier } from "@/types/benchmark";
import type { Priority, Strategy } from "@/types/wizard";
import { API_BUDGET_CEILING } from "@/lib/config/constants";
import { getPresetConfig } from "./presets";
import { estimateCost } from "./cost-estimator";

export interface RecommendConfig {
  /** User-ranked priorities (index 0 = highest) */
  priorities: Priority[];
  /** Selected strategy preset */
  strategy: Strategy;
  /** Full curated model list */
  models: ModelInfo[];
  /** Number of sample images */
  sampleCount: number;
}

export interface RecommendedModelSet {
  /** Recommended models */
  models: ModelInfo[];
  /** Recommended runs per model */
  runsPerModel: number;
  /** Human-readable reasoning for the selection */
  reasoning: string;
}

/** Tier filtering based on strategy */
const STRATEGY_TIERS: Record<Strategy, ModelTier[]> = {
  "quick-survey": ["free", "budget", "mid", "premium", "ultra"],
  balanced: ["budget", "mid", "premium"],
  "deep-dive": ["mid", "premium"],
};

/** Priority weights: #1 gets 3x, #2 gets 2x, #3 gets 1x */
const PRIORITY_WEIGHTS = [3, 2, 1];

/**
 * Score a model based on user priorities.
 * Higher score = better match for user's preferences.
 */
function scoreModel(model: ModelInfo, priorities: Priority[]): number {
  let score = 0;

  for (let i = 0; i < priorities.length; i++) {
    const weight = PRIORITY_WEIGHTS[i] ?? 1;
    const priority = priorities[i];

    switch (priority) {
      case "accuracy": {
        // Premium/ultra tiers get higher accuracy scores
        const accuracyScores: Record<ModelTier, number> = {
          free: 1,
          budget: 2,
          mid: 4,
          premium: 5,
          ultra: 5,
        };
        score += weight * (accuracyScores[model.tier] ?? 1);
        break;
      }
      case "speed": {
        // Cheaper/smaller models tend to be faster
        const speedScores: Record<ModelTier, number> = {
          free: 5,
          budget: 4,
          mid: 3,
          premium: 2,
          ultra: 1,
        };
        score += weight * (speedScores[model.tier] ?? 1);
        break;
      }
      case "cost": {
        // Lower cost = higher score
        const costScores: Record<ModelTier, number> = {
          free: 5,
          budget: 4,
          mid: 3,
          premium: 2,
          ultra: 1,
        };
        score += weight * (costScores[model.tier] ?? 1);
        break;
      }
    }
  }

  return score;
}

/**
 * Recommend a set of models and runs-per-model based on user configuration.
 * Optimizes within the API budget ceiling.
 */
export function recommendModels(config: RecommendConfig): RecommendedModelSet {
  const { priorities, strategy, models, sampleCount } = config;

  const preset = getPresetConfig(strategy);
  if (!preset) {
    return {
      models: [],
      runsPerModel: 1,
      reasoning: "Unknown strategy selected.",
    };
  }

  // Step 1: Filter models by tier based on strategy
  const allowedTiers = STRATEGY_TIERS[strategy];
  const filteredModels = models.filter((m) => allowedTiers.includes(m.tier));

  if (filteredModels.length === 0) {
    return {
      models: [],
      runsPerModel: 1,
      reasoning: "No models available for the selected strategy.",
    };
  }

  // Step 2: Score and sort models by priority weighting
  const scoredModels = filteredModels
    .map((model) => ({
      model,
      score: scoreModel(model, priorities),
    }))
    .sort((a, b) => b.score - a.score);

  // Step 3: Select top N models based on strategy's model count range
  const targetModelCount = Math.min(
    preset.modelCount.max,
    Math.max(preset.modelCount.min, filteredModels.length)
  );
  const selectedModels = scoredModels
    .slice(0, targetModelCount)
    .map((s) => s.model);

  // Step 4: Determine runs-per-model, starting from preset max and optimizing within budget
  let runsPerModel = preset.runsPerModel.max;

  // Try to fit within budget, reducing runs if needed
  while (runsPerModel >= preset.runsPerModel.min) {
    const estimate = estimateCost({
      selectedModels,
      runsPerModel,
      sampleCount,
    });
    if (estimate.estimatedCost <= API_BUDGET_CEILING) {
      break;
    }
    runsPerModel--;
  }

  // If still over budget even at min runs, try reducing model count
  let finalModels = selectedModels;
  if (runsPerModel < preset.runsPerModel.min) {
    runsPerModel = preset.runsPerModel.min;
    // Remove the most expensive models until we fit
    const sortedByCost = [...selectedModels].sort(
      (a, b) => b.inputCostPer1M - a.inputCostPer1M
    );
    finalModels = [];
    for (const model of sortedByCost.reverse()) {
      finalModels.push(model);
      const estimate = estimateCost({
        selectedModels: finalModels,
        runsPerModel,
        sampleCount,
      });
      if (estimate.estimatedCost > API_BUDGET_CEILING) {
        finalModels.pop();
        break;
      }
    }
  }

  // Build reasoning string
  const primaryPriority = priorities[0];
  const strategyLabel = strategy === "quick-survey" ? "broad coverage" : strategy === "deep-dive" ? "deep analysis" : "balanced coverage";
  const reasoning = `${finalModels.length} models selected for ${strategyLabel}, prioritizing ${primaryPriority}. Runs per model automatically optimized to maximize testing within your plan.`;

  return {
    models: finalModels,
    runsPerModel,
    reasoning,
  };
}
