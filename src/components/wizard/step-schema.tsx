"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileJson,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchemaReview } from "@/components/wizard/schema-review";
import { CostPreview } from "@/components/wizard/cost-preview";
import { ModelOverride } from "@/components/wizard/model-override";
import { inferSchemaFromExamples } from "@/lib/schema/infer";
import {
  checkSchemaCompatibility,
  checkSchemaForUnionTypes,
} from "@/lib/schema/validate";
import { recommendModels } from "@/lib/wizard/model-recommender";
import { estimateCost, optimizeRunsForBudget } from "@/lib/wizard/cost-estimator";
import { CURATED_MODELS } from "@/lib/config/models";
import type { ModelInfo } from "@/types/benchmark";
import type {
  ImageEntry,
  Priority,
  Strategy,
  SchemaSource,
} from "@/types/wizard";

interface StepSchemaProps {
  /** Images with parsed JSON from Step 2 */
  images: ImageEntry[];
  /** User's ranked priorities from Step 1 */
  priorities: Priority[];
  /** Selected strategy from Step 1 */
  strategy: Strategy;
  /** Sample count from Step 1 */
  sampleCount: number;
  /** Draft ID for persistence */
  draftId: string;
  /** Called to save schema data to draft */
  onSaveSchema: (data: {
    inferredSchema: Record<string, unknown> | null;
    userSchema: string;
    prompt: string;
    schemaSource: SchemaSource;
    selectedModelIds: string[];
    estimatedCost: number;
    estimatedRuns: number;
  }) => void;
  /** Called when benchmark is marked ready */
  onComplete: () => void;
  /** Existing schema data from draft (for restoring state) */
  savedSchemaData?: {
    inferredSchema?: Record<string, unknown> | null;
    userSchema?: string;
    prompt?: string;
    schemaSource?: SchemaSource;
    selectedModelIds?: string[];
  } | null;
}

const MIN_PROMPT_LENGTH = 20;

export function StepSchema({
  images,
  priorities,
  strategy,
  sampleCount,
  draftId,
  onSaveSchema,
  onComplete,
  savedSchemaData,
}: StepSchemaProps) {
  // Infer schema from uploaded examples
  const inferredSchema = useMemo(() => {
    const examples = images
      .filter((img) => img.jsonValid && img.parsedJson !== null)
      .map((img) => img.parsedJson);
    if (examples.length === 0) return null;
    try {
      return inferSchemaFromExamples(examples);
    } catch {
      return null;
    }
  }, [images]);

  // Check schema compatibility across images
  const compatibility = useMemo(() => {
    const examples = images
      .filter((img) => img.jsonValid && img.parsedJson !== null)
      .map((img, i) => ({ imageIndex: i, json: img.parsedJson }));
    return checkSchemaCompatibility(examples);
  }, [images]);

  // Check inferred schema for union types
  const unionWarnings = useMemo(() => {
    if (!inferredSchema) return [];
    return checkSchemaForUnionTypes(inferredSchema);
  }, [inferredSchema]);

  // All warnings combined
  const allWarnings = useMemo(
    () => [...compatibility.warnings, ...unionWarnings],
    [compatibility.warnings, unionWarnings]
  );

  // State
  const [prompt, setPrompt] = useState(savedSchemaData?.prompt ?? "");
  const [schemaSource, setSchemaSource] = useState<SchemaSource>(
    savedSchemaData?.schemaSource ?? "auto"
  );
  const [userSchema, setUserSchema] = useState(
    savedSchemaData?.userSchema ?? ""
  );
  const [isComplete, setIsComplete] = useState(false);

  // Model recommendation
  const recommendation = useMemo(
    () =>
      recommendModels({
        priorities,
        strategy,
        models: [...CURATED_MODELS] as ModelInfo[],
        sampleCount,
      }),
    [priorities, strategy, sampleCount]
  );

  // Selected models state
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>(() => {
    if (savedSchemaData?.selectedModelIds) {
      const ids = new Set(savedSchemaData.selectedModelIds);
      const restored = (CURATED_MODELS as unknown as ModelInfo[]).filter((m) =>
        ids.has(m.id)
      );
      if (restored.length > 0) return restored;
    }
    return recommendation.models;
  });

  // Update selected models when recommendation changes (only if not customized)
  const hasCustomizedRef = useRef(false);
  useEffect(() => {
    if (!hasCustomizedRef.current && !savedSchemaData?.selectedModelIds) {
      setSelectedModels(recommendation.models);
    }
  }, [recommendation.models, savedSchemaData?.selectedModelIds]);

  const handleSelectedChange = useCallback((models: ModelInfo[]) => {
    hasCustomizedRef.current = true;
    setSelectedModels(models);
  }, []);

  // Auto-optimize runs per model to fill budget based on current selection
  const optimizedRuns = useMemo(
    () => optimizeRunsForBudget(selectedModels, sampleCount),
    [selectedModels, sampleCount]
  );

  // Schema override handler
  const handleSchemaOverride = useCallback(
    (source: SchemaSource, schema: string) => {
      setSchemaSource(source);
      setUserSchema(schema);
    },
    []
  );

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const costEstimate = selectedModels.length > 0
        ? (() => {
            const est = estimateCost({
              selectedModels,
              runsPerModel: optimizedRuns,
              sampleCount,
            });
            return { cost: est.estimatedCost, runs: est.totalRuns };
          })()
        : { cost: 0, runs: 0 };

      onSaveSchema({
        inferredSchema,
        userSchema,
        prompt,
        schemaSource,
        selectedModelIds: selectedModels.map((m) => m.id),
        estimatedCost: costEstimate.cost,
        estimatedRuns: costEstimate.runs,
      });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    prompt,
    schemaSource,
    userSchema,
    selectedModels,
    inferredSchema,
    onSaveSchema,
    optimizedRuns,
    sampleCount,
  ]);

  // Completion gate
  const canComplete = useMemo(() => {
    const hasPrompt = prompt.trim().length >= MIN_PROMPT_LENGTH;
    const hasSchema =
      schemaSource === "auto"
        ? inferredSchema !== null
        : (() => {
            try {
              JSON.parse(userSchema);
              return true;
            } catch {
              return false;
            }
          })();
    const hasModels = selectedModels.length >= 1;
    return hasPrompt && hasSchema && hasModels;
  }, [prompt, schemaSource, inferredSchema, userSchema, selectedModels]);

  const handleComplete = useCallback(() => {
    if (!canComplete) return;
    setIsComplete(true);
    onComplete();
  }, [canComplete, onComplete]);

  // Success state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-text-primary">
            Benchmark Configured!
          </h2>
          <p className="text-sm text-text-secondary max-w-md">
            Your benchmark is ready. Payment will be available soon.
            You can review or edit your configuration anytime.
          </p>
        </div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-ember text-white font-semibold hover:bg-ember-hover transition-colors"
        >
          Return to Dashboard
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <FileJson className="w-5 h-5 text-ember" />
          Schema & Prompt
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Review the auto-detected schema, write an extraction prompt, and
          confirm your model selection.
        </p>
      </div>

      {/* Extraction Prompt */}
      <div className="space-y-2">
        <label
          htmlFor="extraction-prompt"
          className="block text-sm font-medium text-text-primary"
        >
          Extraction Prompt
        </label>
        <p className="text-xs text-text-muted">
          Describe what data should be extracted from these images. Be specific
          about fields, formats, and any special instructions.
        </p>
        <textarea
          id="extraction-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what data should be extracted from these images. E.g., 'Extract all line items, totals, tax, vendor name, and date from this receipt.'"
          className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-surface-border bg-surface-raised text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-ember/50 focus:border-ember resize-y"
          rows={4}
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${
              prompt.trim().length >= MIN_PROMPT_LENGTH
                ? "text-emerald-400"
                : "text-text-muted"
            }`}
          >
            {prompt.trim().length >= MIN_PROMPT_LENGTH
              ? "Prompt looks good"
              : `${MIN_PROMPT_LENGTH - prompt.trim().length} more characters needed`}
          </span>
          <span className="text-xs text-text-muted">
            {prompt.trim().length} characters
          </span>
        </div>
      </div>

      {/* Schema Review */}
      <SchemaReview
        inferredSchema={inferredSchema}
        warnings={allWarnings}
        schemaSource={schemaSource}
        userSchema={userSchema}
        onSchemaOverride={handleSchemaOverride}
      />

      {/* Model Selection & Cost Preview */}
      <div className="space-y-6">
        {/* Model override */}
        <ModelOverride
          recommendedModels={recommendation.models}
          allModels={[...CURATED_MODELS] as ModelInfo[]}
          selectedModels={selectedModels}
          onSelectedChange={handleSelectedChange}
        />

        {/* Recommendation reasoning */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-surface-raised border border-surface-border">
          <Sparkles className="w-3.5 h-3.5 text-ember mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary">
            {recommendation.reasoning}
          </p>
        </div>

        {/* Testing plan preview */}
        <CostPreview
          selectedModels={selectedModels}
          runsPerModel={optimizedRuns}
          sampleCount={sampleCount}
        />
      </div>

      {/* Ready for Payment CTA */}
      <div className="pt-4 border-t border-surface-border">
        <Button
          variant="primary"
          size="lg"
          onClick={handleComplete}
          disabled={!canComplete}
          className="w-full"
        >
          <CheckCircle2 className="w-5 h-5" />
          Ready for Payment
        </Button>
        {!canComplete && (
          <p className="text-xs text-text-muted text-center mt-2">
            {prompt.trim().length < MIN_PROMPT_LENGTH
              ? "Provide an extraction prompt (min 20 characters)"
              : selectedModels.length === 0
                ? "Select at least one model"
                : "Complete all fields to continue"}
          </p>
        )}
      </div>
    </div>
  );
}
