import { Check } from "lucide-react";

export interface StepItem {
  id: number;
  title: string;
  shortTitle?: string;
  description?: string;
}

export interface StepIndicatorProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-3 gap-2 relative">
        {/* Progress connecting line */}
        <div className="absolute top-4 left-[16%] right-[16%] h-[2px] bg-white/10 -z-0" />
        <div
          className="absolute top-4 left-[16%] h-[2px] bg-brand-green transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 68}%`,
          }}
        />

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const canClick = onStepClick && (isCompleted || isCurrent);

          return (
            <div
              key={step.id}
              className="flex flex-col items-center text-center relative z-10"
            >
              <button
                type="button"
                onClick={() => canClick && onStepClick(step.id)}
                disabled={!canClick}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                  isCompleted
                    ? "bg-brand-green text-black ring-4 ring-brand-green/20 cursor-pointer shadow-md"
                    : isCurrent
                    ? "bg-black border-2 border-brand-green text-brand-green ring-4 ring-brand-green/30 shadow-md scale-105"
                    : "bg-surface-code border border-white/10 text-stone"
                } ${canClick ? "hover:scale-110" : ""}`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span>{step.id}</span>
                )}
              </button>

              <span
                className={`text-[11px] sm:text-xs font-medium mt-1.5 block truncate max-w-full transition-colors ${
                  isCurrent
                    ? "text-brand-green font-bold"
                    : isCompleted
                    ? "text-on-dark"
                    : "text-stone"
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
