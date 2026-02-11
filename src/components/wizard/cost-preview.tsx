"use client";

import { useMemo } from "react";
import {
  Clock,
  Cpu,
  BarChart3,
  Repeat,
  Sparkles,
} from "lucide-react";
import type { ModelInfo, ModelTier } from "@/types/benchmark";
import { estimateCost, type CostEstimate } from "@/lib/wizard/cost-estimator";

interface CostPreviewProps {
  selectedModels: ModelInfo[];
  runsPerModel: number;
  sampleCount: number;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  low: "bg-red-500/15 text-red-400",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-emerald-500/15 text-emerald-400",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  low: "More images or models may improve results",
  medium: "Good statistical reliability",
  high: "High statistical confidence in results",
};

export function CostPreview({
  selectedModels,
  runsPerModel,
  sampleCount,
}: CostPreviewProps) {
  const estimate: CostEstimate = useMemo(
    () =>
      estimateCost({
        selectedModels,
        runsPerModel,
        sampleCount,
      }),
    [selectedModels, runsPerModel, sampleCount]
  );

  // Calculate tier breakdown
  const tierBreakdown = useMemo(() => {
    const counts: Partial<Record<ModelTier, number>> = {};
    for (const model of selectedModels) {
      counts[model.tier] = (counts[model.tier] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([tier, count]) => `${count} ${tier}`)
      .join(", ");
  }, [selectedModels]);

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5 space-y-4">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-ember" />
        Your Testing Plan
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Models to test */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Cpu className="w-3.5 h-3.5" />
            <span className="text-xs">Models</span>
          </div>
          <p className="text-sm font-medium text-text-primary">
            {selectedModels.length} models
          </p>
          {tierBreakdown && (
            <p className="text-[10px] text-text-muted">{tierBreakdown}</p>
          )}
        </div>

        {/* Runs per model */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Repeat className="w-3.5 h-3.5" />
            <span className="text-xs">Runs per model</span>
          </div>
          <p className="text-sm font-medium text-text-primary">
            {runsPerModel} runs
          </p>
          <p className="text-[10px] text-text-muted">
            across {sampleCount} image{sampleCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Total comparisons */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-xs">Total comparisons</span>
          </div>
          <p className="text-sm font-medium text-text-primary">
            {estimate.totalRuns.toLocaleString()}
          </p>
        </div>

        {/* Estimated time */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">Estimated time</span>
          </div>
          <p className="text-sm font-medium text-text-primary">
            ~{estimate.estimatedTimeMinutes} min
          </p>
        </div>
      </div>

      {/* Confidence indicator */}
      <div className="flex items-center gap-2 pt-1">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            CONFIDENCE_COLORS[estimate.confidenceLevel]
          }`}
        >
          {estimate.confidenceLevel} confidence
        </span>
        <span className="text-[10px] text-text-muted">
          {CONFIDENCE_LABELS[estimate.confidenceLevel]}
        </span>
      </div>
    </div>
  );
}
