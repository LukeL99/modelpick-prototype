"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { StepConfig } from "@/components/wizard/step-config";
import type { WizardStep, Priority, Strategy, ImageEntry } from "@/types/wizard";
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

interface UploadData {
  images: ImageEntry[];
}

const DEFAULT_CONFIG: ConfigData = {
  priorities: DEFAULT_PRIORITIES,
  strategy: DEFAULT_STRATEGY,
  sampleCount: DEFAULT_SAMPLE_COUNT,
};

const DEFAULT_UPLOAD: UploadData = {
  images: [],
};

export default function NewBenchmarkPage() {
  const [step, setStep] = useQueryState(
    "step",
    parseAsStringEnum<WizardStep>(STEPS).withDefault("config")
  );

  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [configData, setConfigData] = useState<ConfigData>(DEFAULT_CONFIG);
  const [uploadData, setUploadData] = useState<UploadData>(DEFAULT_UPLOAD);
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(
    new Set()
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        // No draft param -- try to find the most recent active draft
        // or create a new one
        const createRes = await fetch("/api/drafts", { method: "POST" });
        if (createRes.ok) {
          const draft: BenchmarkDraft = await createRes.json();
          if (!cancelled) {
            setDraftId(draft.id);
            setLoading(false);
          }
        } else {
          // Might fail if not authenticated
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
      // If config data exists, mark config as completed
      setCompletedSteps((prev) => new Set([...prev, "config"]));
    }

    const ud = draft.upload_data as Record<string, unknown> | null;
    if (ud && Object.keys(ud).length > 0) {
      setUploadData({
        images: (ud.images as ImageEntry[]) ?? [],
      });
      // If upload data has images with valid JSON, mark upload as completed
      const images = (ud.images as ImageEntry[]) ?? [];
      if (images.length > 0 && images.every((img) => img.jsonValid)) {
        setCompletedSteps((prev) => new Set([...prev, "config", "upload"]));
      }
    }
  }

  // Auto-save config data with debounce
  const saveDraftConfig = useCallback(
    (data: ConfigData) => {
      if (!draftId) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const res = await fetch(`/api/drafts/${draftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: "config",
              data: {
                priorities: data.priorities,
                strategy: data.strategy,
                sampleCount: data.sampleCount,
              },
            }),
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
      }, 500);
    },
    [draftId]
  );

  const handleConfigChange = useCallback(
    (newConfig: ConfigData) => {
      setConfigData(newConfig);
      saveDraftConfig(newConfig);
    },
    [saveDraftConfig]
  );

  const handleStepChange = useCallback(
    (newStep: WizardStep) => {
      // Mark the current step as completed when advancing forward
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

  // Determine if current step can continue
  const canContinue = (() => {
    if (step === "config") {
      // Config always has defaults, so it's always valid
      return (
        configData.priorities.length === 3 &&
        configData.strategy !== undefined &&
        configData.sampleCount >= 1
      );
    }
    if (step === "upload") {
      // All images must have valid JSON
      return (
        uploadData.images.length >= 1 &&
        uploadData.images.every((img) => img.jsonValid)
      );
    }
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
        {step === "upload" && (
          <div className="text-text-muted text-center py-20">
            <p>Step 2: Upload will be implemented in Task 2</p>
          </div>
        )}
        {step === "schema" && (
          <div className="text-text-muted text-center py-20">
            <p>Step 3: Schema & Prompt (Plan 01-04)</p>
          </div>
        )}
      </WizardShell>
    </>
  );
}
