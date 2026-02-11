/**
 * Cost estimation for benchmark configurations.
 * Calculates estimated API cost, total runs, time, and confidence level.
 */
import type { ModelInfo } from "@/types/benchmark";
import { API_BUDGET_CEILING, PRICES_AS_OF_DATE } from "@/lib/config/constants";

/** Conservative token estimates for vision model calls */
const AVG_INPUT_TOKENS = 1500; // ~1500 tokens per image (vision)
const AVG_OUTPUT_TOKENS = 500; // ~500 tokens per JSON response

/** Average seconds per API call (conservative, accounts for queue time) */
const AVG_SECONDS_PER_RUN = 3;

/** Parallelism factor (concurrent API calls) */
const PARALLELISM_FACTOR = 3;

export type ConfidenceLevel = "low" | "medium" | "high";

export interface CostEstimateInput {
  /** Models selected for benchmarking */
  selectedModels: ModelInfo[];
  /** Number of runs per model per sample image */
  runsPerModel: number;
  /** Number of sample images */
  sampleCount: number;
}

export interface CostEstimate {
  /** Estimated total API cost in USD */
  estimatedCost: number;
  /** Total number of API calls */
  totalRuns: number;
  /** Estimated execution time in minutes */
  estimatedTimeMinutes: number;
  /** Statistical confidence level based on runs per model */
  confidenceLevel: ConfidenceLevel;
  /** Percentage of budget used (0-100+) */
  budgetUtilization: number;
  /** Warning message if budget exceeded */
  warning?: string;
  /** Per-model cost breakdown */
  perModelCost: number[];
  /** Prices disclaimer date */
  pricesAsOf: string;
}

/**
 * Calculate the cost per API call for a given model.
 */
function costPerRun(model: ModelInfo): number {
  const inputCost = (AVG_INPUT_TOKENS * model.inputCostPer1M) / 1_000_000;
  const outputCost = (AVG_OUTPUT_TOKENS * model.outputCostPer1M) / 1_000_000;
  return inputCost + outputCost;
}

/**
 * Determine confidence level based on runs per model.
 */
function getConfidenceLevel(runsPerModel: number): ConfidenceLevel {
  if (runsPerModel < 3) return "low";
  if (runsPerModel <= 5) return "medium";
  return "high";
}

/**
 * Estimate the cost of a benchmark configuration.
 */
export function estimateCost(config: CostEstimateInput): CostEstimate {
  const { selectedModels, runsPerModel, sampleCount } = config;

  if (selectedModels.length === 0) {
    return {
      estimatedCost: 0,
      totalRuns: 0,
      estimatedTimeMinutes: 0,
      confidenceLevel: "low",
      budgetUtilization: 0,
      perModelCost: [],
      pricesAsOf: PRICES_AS_OF_DATE,
    };
  }

  // Calculate per-model costs
  const perModelCost = selectedModels.map((model) => {
    const cpr = costPerRun(model);
    return cpr * runsPerModel * sampleCount;
  });

  // Total cost
  const estimatedCost = perModelCost.reduce((sum, c) => sum + c, 0);

  // Total number of API calls
  const totalRuns = selectedModels.length * runsPerModel * sampleCount;

  // Estimated time with parallelism
  const totalSeconds = (totalRuns * AVG_SECONDS_PER_RUN) / PARALLELISM_FACTOR;
  const estimatedTimeMinutes = Math.ceil(totalSeconds / 60);

  // Budget utilization
  const budgetUtilization = (estimatedCost / API_BUDGET_CEILING) * 100;

  // Confidence level
  const confidenceLevel = getConfidenceLevel(runsPerModel);

  // Warning if over budget
  let warning: string | undefined;
  if (estimatedCost > API_BUDGET_CEILING) {
    warning =
      "Estimated cost exceeds the $7.00 budget. The system will optimize runs per model to fit within budget.";
  }

  return {
    estimatedCost: Math.round(estimatedCost * 10000) / 10000,
    totalRuns,
    estimatedTimeMinutes,
    confidenceLevel,
    budgetUtilization: Math.round(budgetUtilization * 10) / 10,
    warning,
    perModelCost,
    pricesAsOf: PRICES_AS_OF_DATE,
  };
}

/**
 * Get the cost per single API call for a model (for display).
 */
export function getModelCostPerRun(model: ModelInfo): number {
  return Math.round(costPerRun(model) * 1_000_000) / 1_000_000;
}

/** Maximum runs per model to cap optimization (diminishing returns beyond this) */
const MAX_OPTIMIZED_RUNS = 20;

/** Minimum runs per model (need at least 3 for meaningful statistics) */
const MIN_OPTIMIZED_RUNS = 3;

/**
 * Calculate optimal runs per model to maximize budget utilization.
 * Automatically fills the budget based on selected models and sample count.
 */
export function optimizeRunsForBudget(
  selectedModels: ModelInfo[],
  sampleCount: number,
  budget: number = API_BUDGET_CEILING
): number {
  if (selectedModels.length === 0 || sampleCount === 0) return MIN_OPTIMIZED_RUNS;

  // Cost of running all selected models once per sample
  const costPerRound = selectedModels.reduce(
    (sum, model) => sum + costPerRun(model),
    0
  ) * sampleCount;

  if (costPerRound === 0) return MAX_OPTIMIZED_RUNS;

  // Calculate max affordable runs
  const maxAffordable = Math.floor(budget / costPerRound);

  // Clamp between min and max
  return Math.max(MIN_OPTIMIZED_RUNS, Math.min(maxAffordable, MAX_OPTIMIZED_RUNS));
}
