/**
 * Strategy preset definitions with concrete model/run allocations.
 * These power the wizard's model recommendation and cost estimation.
 */
import type { Strategy } from "@/types/wizard";

export interface StrategyPresetConfig {
  id: Strategy;
  name: string;
  description: string;
  icon: string;
  modelCount: { min: number; max: number };
  runsPerModel: { min: number; max: number };
  recommended: boolean;
  rationale: string;
}

/**
 * Strategy presets define the tradeoff between breadth (more models)
 * and depth (more runs per model).
 */
export const STRATEGY_PRESETS: StrategyPresetConfig[] = [
  {
    id: "quick-survey",
    name: "Quick Survey",
    description:
      "Test many models with fewer runs each. Great for narrowing down candidates.",
    icon: "zap",
    modelCount: { min: 18, max: 20 },
    runsPerModel: { min: 2, max: 3 },
    recommended: false,
    rationale:
      "Broad coverage across all tiers. Lower statistical confidence per model but identifies the top contenders quickly.",
  },
  {
    id: "balanced",
    name: "Balanced",
    description:
      "Moderate number of models with solid statistical confidence.",
    icon: "bar-chart",
    modelCount: { min: 12, max: 15 },
    runsPerModel: { min: 3, max: 5 },
    recommended: true,
    rationale:
      "Best tradeoff between coverage and confidence. Tests enough models to find the best while running enough times to trust the results.",
  },
  {
    id: "deep-dive",
    name: "Deep Dive",
    description:
      "Fewer models but more runs each. Best for final selection with high confidence.",
    icon: "target",
    modelCount: { min: 6, max: 8 },
    runsPerModel: { min: 5, max: 8 },
    recommended: false,
    rationale:
      "Maximum statistical confidence on a focused set. Ideal when you already know which tier you want and need reliable accuracy numbers.",
  },
];

/**
 * Get the preset configuration for a given strategy ID.
 */
export function getPresetConfig(
  strategyId: Strategy
): StrategyPresetConfig | undefined {
  return STRATEGY_PRESETS.find((p) => p.id === strategyId);
}
