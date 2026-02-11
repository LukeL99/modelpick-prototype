"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { StepConfig } from "@/components/wizard/step-config";
import { StepUpload } from "@/components/wizard/step-upload";
import { StepSchema } from "@/components/wizard/step-schema";
import type {
  WizardStep,
  Priority,
  Strategy,
  ImageEntry,
  SchemaSource,
} from "@/types/wizard";
import type { BenchmarkDraft } from "@/types/database";
import {
  DEFAULT_PRIORITIES,
  DEFAULT_STRATEGY,
  DEFAULT_SAMPLE_COUNT,
} from "@/lib/config/constants";

const STEPS: WizardStep[] = ["config", "upload", "schema"];

interface ConfigData {
  priorities: Priority[];
  strategy: Strategy;
  sampleCount: number;
}

const DEFAULT_CONFIG: ConfigData = {
  priorities: DEFAULT_PRIORITIES,
  strategy: DEFAULT_STRATEGY,
  sampleCount: DEFAULT_SAMPLE_COUNT,
};

interface SavedSchemaData {
  inferredSchema?: Record<string, unknown> | null;
  userSchema?: string;
  prompt?: string;
  schemaSource?: SchemaSource;
  selectedModelIds?: string[];
}

export default function NewBenchmarkPage() {
  const [step, setStep] = useQueryState(
    "step",
    parseAsStringEnum<WizardStep>(STEPS).withDefault("config")
  );

  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [configData, setConfigData] = useState<ConfigData>(DEFAULT_CONFIG);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(
    new Set()
  );
  const [savedSchemaData, setSavedSchemaData] =
    useState<SavedSchemaData | null>(null);

  const configSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize draft: load existing or create new
  useEffect(() => {
    let cancelled = false;

    async function initDraft() {
      try {
        // Check URL for ?draft= param
        const url = new URL(window.location.href);
        const draftParam = url.searchParams.get("draft");

        if (draftParam) {
          // Load existing draft by ID
          const res = await fetch(`/api/drafts/${draftParam}`);
          if (res.ok) {
            const draft: BenchmarkDraft = await res.json();
            if (!cancelled) {
              setDraftId(draft.id);
              loadDraftData(draft);
              setLoading(false);
              return;
            }
          }
        }

        // No draft param -- create a new draft
        const createRes = await fetch("/api/drafts", { method: "POST" });
        if (createRes.ok) {
          const draft: BenchmarkDraft = await createRes.json();
          if (!cancelled) {
            setDraftId(draft.id);
            setLoading(false);
          }
        } else {
          if (!cancelled) setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    initDraft();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function loadDraftData(draft: BenchmarkDraft) {
    const cd = draft.config_data as Record<string, unknown> | null;
    if (cd && Object.keys(cd).length > 0) {
      setConfigData({
        priorities: (cd.priorities as Priority[]) ?? DEFAULT_PRIORITIES,
        strategy: (cd.strategy as Strategy) ?? DEFAULT_STRATEGY,
        sampleCount: (cd.sampleCount as number) ?? DEFAULT_SAMPLE_COUNT,
      });
      setCompletedSteps((prev) => new Set([...prev, "config"]));
    }

    const ud = draft.upload_data as Record<string, unknown> | null;
    if (ud && Object.keys(ud).length > 0) {
      const loadedImages = (ud.images as ImageEntry[]) ?? [];
      // Re-parse JSON for loaded images
      const imagesWithParsed = loadedImages.map((img) => {
        if (img.expectedJson && img.jsonValid) {
          try {
            return { ...img, parsedJson: JSON.parse(img.expectedJson) };
          } catch {
            return { ...img, parsedJson: null, jsonValid: false };
          }
        }
        return img;
      });
      setImages(imagesWithParsed);
      if (
        imagesWithParsed.length > 0 &&
        imagesWithParsed.every((img) => img.jsonValid)
      ) {
        setCompletedSteps((prev) => new Set([...prev, "config", "upload"]));
      }
    }

    // Load schema data
    const sd = draft.schema_data as Record<string, unknown> | null;
    if (sd && Object.keys(sd).length > 0) {
      setSavedSchemaData({
        inferredSchema: sd.inferredSchema as Record<string, unknown> | null,
        userSchema: sd.userSchema as string | undefined,
        prompt: sd.prompt as string | undefined,
        schemaSource: sd.schemaSource as SchemaSource | undefined,
        selectedModelIds: sd.selectedModelIds as string[] | undefined,
      });
      if (sd.prompt && (sd.prompt as string).trim().length >= 20) {
        setCompletedSteps((prev) =>
          new Set([...prev, "config", "upload", "schema"])
        );
      }
    }
  }

  // Shared save utility
  const saveDraftStep = useCallback(
    async (
      stepName: "config" | "upload" | "schema",
      data: Record<string, unknown>
    ) => {
      if (!draftId) return;
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: stepName, data }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [draftId]
  );

  // Auto-save config data with debounce
  const debounceSaveConfig = useCallback(
    (data: ConfigData) => {
      if (configSaveTimerRef.current) {
        clearTimeout(configSaveTimerRef.current);
      }
      configSaveTimerRef.current = setTimeout(() => {
        saveDraftStep("config", {
          priorities: data.priorities,
          strategy: data.strategy,
          sampleCount: data.sampleCount,
        });
      }, 500);
    },
    [saveDraftStep]
  );

  // Auto-save upload data with debounce
  const debounceSaveUpload = useCallback(
    (imgs: ImageEntry[]) => {
      if (uploadSaveTimerRef.current) {
        clearTimeout(uploadSaveTimerRef.current);
      }
      uploadSaveTimerRef.current = setTimeout(() => {
        // Strip parsedJson (large objects) and local blob URLs from persistence
        const serializableImages = imgs.map((img) => ({
          id: img.id,
          path: img.path,
          publicUrl: img.publicUrl.startsWith("blob:") ? "" : img.publicUrl,
          filename: img.filename,
          fileSize: img.fileSize,
          expectedJson: img.expectedJson,
          jsonValid: img.jsonValid,
          parsedJson: null,
        }));
        saveDraftStep("upload", { images: serializableImages });
      }, 500);
    },
    [saveDraftStep]
  );

  const handleConfigChange = useCallback(
    (newConfig: ConfigData) => {
      setConfigData(newConfig);
      debounceSaveConfig(newConfig);
    },
    [debounceSaveConfig]
  );

  const handleImagesChange = useCallback(
    (newImages: ImageEntry[]) => {
      setImages(newImages);
      debounceSaveUpload(newImages);
    },
    [debounceSaveUpload]
  );

  const handleStepChange = useCallback(
    (newStep: WizardStep) => {
      const stepOrder: WizardStep[] = ["config", "upload", "schema"];
      const currentIdx = stepOrder.indexOf(step!);
      const newIdx = stepOrder.indexOf(newStep);

      if (newIdx > currentIdx) {
        setCompletedSteps((prev) => new Set([...prev, step!]));
      }

      setStep(newStep);
    },
    [step, setStep]
  );

  // Save schema data handler
  const handleSaveSchema = useCallback(
    (data: {
      inferredSchema: Record<string, unknown> | null;
      userSchema: string;
      prompt: string;
      schemaSource: SchemaSource;
      selectedModelIds: string[];
      estimatedCost: number;
      estimatedRuns: number;
    }) => {
      saveDraftStep("schema", {
        inferredSchema: data.inferredSchema,
        userSchema: data.userSchema,
        prompt: data.prompt,
        schemaSource: data.schemaSource,
        selectedModelIds: data.selectedModelIds,
      });
    },
    [saveDraftStep]
  );

  // Handle benchmark completion: set draft to 'ready'
  const handleComplete = useCallback(async () => {
    if (!draftId) return;
    setSaveStatus("saving");
    try {
      // Update draft status to 'ready' and save final computed fields
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "schema",
          data: savedSchemaData ?? {},
          status: "ready",
        }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setCompletedSteps(
          (prev) => new Set([...prev, "config", "upload", "schema"])
        );
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, [draftId, savedSchemaData, saveDraftStep]);

  // Determine if current step can continue
  const canContinue = (() => {
    if (step === "config") {
      return (
        configData.priorities.length === 3 &&
        configData.strategy !== undefined &&
        configData.sampleCount >= 1
      );
    }
    if (step === "upload") {
      return (
        images.length >= configData.sampleCount &&
        images.every((img) => img.jsonValid)
      );
    }
    // Step 3 uses its own "Ready for Payment" CTA, not the Continue button
    return false;
  })();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
            <span className="text-sm text-text-muted">
              Setting up your benchmark...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Save status indicator */}
      {saveStatus !== "idle" && (
        <div className="fixed top-16 right-4 z-40">
          <span
            className={`text-xs px-2 py-1 rounded-md ${
              saveStatus === "saving"
                ? "bg-surface-raised text-text-muted"
                : saveStatus === "saved"
                  ? "bg-surface-raised text-emerald-400"
                  : "bg-red-900/50 text-red-400"
            }`}
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "Saved"
                : "Failed to save"}
          </span>
        </div>
      )}

      <WizardShell
        currentStep={step!}
        onStepChange={handleStepChange}
        completedSteps={completedSteps}
        canContinue={canContinue}
      >
        {step === "config" && (
          <StepConfig
            config={configData}
            onConfigChange={handleConfigChange}
          />
        )}
        {step === "upload" && draftId && (
          <StepUpload
            images={images}
            draftId={draftId}
            sampleCount={configData.sampleCount}
            onImagesChange={handleImagesChange}
          />
        )}
        {step === "schema" && draftId && (
          <StepSchema
            images={images}
            priorities={configData.priorities}
            strategy={configData.strategy}
            sampleCount={configData.sampleCount}
            draftId={draftId}
            onSaveSchema={handleSaveSchema}
            onComplete={handleComplete}
            savedSchemaData={savedSchemaData}
          />
        )}
      </WizardShell>
    </>
  );
}
