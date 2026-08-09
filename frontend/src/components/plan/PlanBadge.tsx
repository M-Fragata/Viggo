import type { PlanTier } from "../../services/api";

interface PlanBadgeProps {
  plan: PlanTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const planColors: Record<PlanTier, string> = {
  DYNAMIC: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ENTERPRISE_CUSTOM: "bg-amber-100 text-amber-700 border-amber-200",
};

const planLabels: Record<PlanTier, string> = {
  DYNAMIC: "Viggo",
  ENTERPRISE_CUSTOM: "Enterprise",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export function PlanBadge({ plan, size = "md", showLabel = true }: PlanBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${planColors[plan]} ${sizeClasses[size]}`}
    >
      {showLabel && planLabels[plan]}
    </span>
  );
}
