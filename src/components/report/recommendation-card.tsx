import { Trophy } from "lucide-react";
import type { ModelSummary } from "@/types/report";

interface RecommendationCardProps {
  recommended: ModelSummary | undefined;
  rationale: string;
  models: ModelSummary[];
}

export function RecommendationCard({
  recommended,
  rationale,
  models,
}: RecommendationCardProps) {
  if (!recommended) return null;

  // Calculate savings vs most expensive model
  const modelsWithCost = models.filter((m) => m.costPerRun > 0);
  let savingsText: string | null = null;
  if (modelsWithCost.length > 1) {
    const mostExpensive = modelsWithCost.reduce((max, m) =>
      m.costPerRun > max.costPerRun ? m : max
    );
    if (
      mostExpensive.modelId !== recommended.modelId &&
      mostExpensive.costPerRun > 0
    ) {
      const savingsPercent =
        ((mostExpensive.costPerRun - recommended.costPerRun) /
          mostExpensive.costPerRun) *
        100;
      if (savingsPercent > 10) {
        savingsText = `Save ${Math.round(savingsPercent)}% vs ${mostExpensive.modelName}`;
      }
    }
  }

  return (
    <div className="bg-surface-raised border border-ember/30 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-ember" />
          <span className="text-sm text-text-muted uppercase tracking-wide font-medium">
            Top Recommendation
          </span>
        </div>
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-text-primary">
            {recommended.modelName}
          </h3>
          <span className="text-sm text-text-muted">
            {recommended.provider} | {recommended.tier}
          </span>
        </div>
      </div>

      {/* Rationale */}
      <p className="text-text-secondary">{rationale}</p>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCell label="Accuracy" value={`${recommended.accuracy}%`} />
        <MetricCell
          label="Cost"
          value={`$${recommended.costPerRun.toFixed(4)}/call`}
        />
        <MetricCell
          label="Median Latency"
          value={`${recommended.medianLatency.toLocaleString()}ms`}
        />
        <MetricCell
          label="Consistency"
          value={`\u00b1${recommended.spread}%`}
        />
      </div>

      {/* Savings badge */}
      {savingsText && (
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
          {savingsText}
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-text-muted uppercase tracking-wide">
        {label}
      </p>
      <p className="text-lg font-semibold text-text-primary tabular-nums font-mono">
        {value}
      </p>
    </div>
  );
}
