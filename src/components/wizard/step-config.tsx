"use client";

import { useCallback } from "react";
import { PriorityRanker } from "@/components/wizard/priority-ranker";
import { StrategyPicker } from "@/components/wizard/strategy-picker";
import { Minus, Plus } from "lucide-react";
import type { Priority, Strategy } from "@/types/wizard";
import {
  MIN_SAMPLE_COUNT,
  MAX_SAMPLE_COUNT,
} from "@/lib/config/constants";

interface ConfigData {
  priorities: Priority[];
  strategy: Strategy;
  sampleCount: number;
}

interface StepConfigProps {
  config: ConfigData;
  onConfigChange: (config: ConfigData) => void;
}

export function StepConfig({ config, onConfigChange }: StepConfigProps) {
  const handlePriorityChange = useCallback(
    (priorities: Priority[]) => {
      onConfigChange({ ...config, priorities });
    },
    [config, onConfigChange]
  );

  const handleStrategyChange = useCallback(
    (strategy: Strategy) => {
      onConfigChange({ ...config, strategy });
    },
    [config, onConfigChange]
  );

  const handleSampleCountChange = useCallback(
    (delta: number) => {
      const newCount = Math.min(
        MAX_SAMPLE_COUNT,
        Math.max(MIN_SAMPLE_COUNT, config.sampleCount + delta)
      );
      onConfigChange({ ...config, sampleCount: newCount });
    },
    [config, onConfigChange]
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          Configure Your Benchmark
        </h2>
        <p className="text-sm text-text-secondary">
          Set your priorities, choose a strategy, and decide how many sample
          images you will provide.
        </p>
      </div>

      {/* Priority Ranking */}
      <section>
        <PriorityRanker
          value={config.priorities}
          onChange={handlePriorityChange}
        />
      </section>

      {/* Strategy Selection */}
      <section>
        <StrategyPicker
          value={config.strategy}
          onChange={handleStrategyChange}
        />
      </section>

      {/* Sample Count */}
      <section>
        <label className="block text-sm font-medium text-text-primary mb-3">
          How many sample images will you provide?
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => handleSampleCountChange(-1)}
            disabled={config.sampleCount <= MIN_SAMPLE_COUNT}
            className="w-9 h-9 rounded-lg border border-surface-border bg-surface-raised flex items-center justify-center text-text-secondary hover:border-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-2xl font-bold text-text-primary tabular-nums w-10 text-center">
            {config.sampleCount}
          </span>
          <button
            type="button"
            onClick={() => handleSampleCountChange(1)}
            disabled={config.sampleCount >= MAX_SAMPLE_COUNT}
            className="w-9 h-9 rounded-lg border border-surface-border bg-surface-raised flex items-center justify-center text-text-secondary hover:border-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-muted">
            {config.sampleCount === 1 ? "image" : "images"} ({MIN_SAMPLE_COUNT}
            -{MAX_SAMPLE_COUNT})
          </span>
        </div>
      </section>
    </div>
  );
}
