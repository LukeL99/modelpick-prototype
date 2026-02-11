"use client";

import { type ReactNode } from "react";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WizardStep } from "@/types/wizard";

const STEP_ORDER: WizardStep[] = ["config", "upload", "schema"];

interface WizardShellProps {
  currentStep: WizardStep;
  onStepChange: (step: WizardStep) => void;
  completedSteps: Set<WizardStep>;
  canContinue: boolean;
  children: ReactNode;
}

export function WizardShell({
  currentStep,
  onStepChange,
  completedSteps,
  canContinue,
  children,
}: WizardShellProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_ORDER.length - 1;

  const handleBack = () => {
    if (!isFirst) {
      onStepChange(STEP_ORDER[currentIndex - 1]);
    }
  };

  const handleContinue = () => {
    if (!isLast && canContinue) {
      onStepChange(STEP_ORDER[currentIndex + 1]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Step indicator */}
      <div className="mb-8">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepChange={onStepChange}
        />
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">{children}</div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-border">
        <div>
          {!isFirst && (
            <Button variant="ghost" size="md" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}
        </div>
        <div>
          {!isLast && (
            <Button
              variant="primary"
              size="md"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
