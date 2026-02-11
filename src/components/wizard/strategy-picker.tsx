"use client";

import { Zap, BarChart3, Target } from "lucide-react";
import type { Strategy } from "@/types/wizard";
import { STRATEGY_PRESETS } from "@/types/wizard";
import type { LucideIcon } from "lucide-react";

const STRATEGY_ICONS: Record<Strategy, LucideIcon> = {
  "quick-survey": Zap,
  balanced: BarChart3,
  "deep-dive": Target,
};

const STRATEGY_DETAILS: Record<
  Strategy,
  { models: string; runsPerModel: string }
> = {
  "quick-survey": { models: "~18-20 models", runsPerModel: "~2-3 runs each" },
  balanced: { models: "~12-15 models", runsPerModel: "~3-5 runs each" },
  "deep-dive": { models: "~6-8 models", runsPerModel: "~5-8 runs each" },
};

interface StrategyPickerProps {
  value: Strategy;
  onChange: (strategy: Strategy) => void;
}

export function StrategyPicker({ value, onChange }: StrategyPickerProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-primary mb-3">
        Choose a testing strategy
      </label>
      <div className="grid gap-3">
        {STRATEGY_PRESETS.map((preset) => {
          const Icon = STRATEGY_ICONS[preset.id];
          const details = STRATEGY_DETAILS[preset.id];
          const isSelected = value === preset.id;
          const isRecommended = preset.id === "balanced";

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`relative w-full text-left p-4 rounded-xl border-2 transition-colors ${
                isSelected
                  ? "border-ember bg-surface-raised"
                  : "border-surface-border bg-surface hover:border-text-muted"
              }`}
            >
              {isRecommended && (
                <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-ember text-white">
                  Recommended
                </span>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? "bg-ember/20 text-ember"
                      : "bg-surface-raised text-text-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {preset.name}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {preset.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-text-muted">
                      {details.models}
                    </span>
                    <span className="text-xs text-text-muted">&middot;</span>
                    <span className="text-xs text-text-muted">
                      {details.runsPerModel}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
