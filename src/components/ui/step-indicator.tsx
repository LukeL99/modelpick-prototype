"use client";

import { Check } from "lucide-react";
import type { WizardStep } from "@/types/wizard";

interface StepInfo {
  id: WizardStep;
  label: string;
  number: number;
}

const STEPS: StepInfo[] = [
  { id: "config", label: "Configure", number: 1 },
  { id: "upload", label: "Upload", number: 2 },
  { id: "schema", label: "Schema & Prompt", number: 3 },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  onStepChange: (step: WizardStep) => void;
}

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepChange,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Wizard progress" className="w-full">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isCompleted;
          const isLast = index === STEPS.length - 1;

          return (
            <li
              key={step.id}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepChange(step.id)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-1.5 group ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Circle */}
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCompleted
                      ? "bg-ember text-white"
                      : isCurrent
                        ? "border-2 border-ember text-ember bg-transparent"
                        : "border-2 border-surface-border text-text-muted bg-transparent"
                  } ${isClickable ? "group-hover:ring-2 group-hover:ring-ember/30" : ""}`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </span>
                {/* Label */}
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent
                      ? "text-ember"
                      : isCompleted
                        ? "text-text-primary"
                        : "text-text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${
                    isCompleted ? "bg-ember" : "bg-surface-border"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
