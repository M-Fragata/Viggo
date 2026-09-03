import type { PlanTier } from "../../services/api";

interface PlanBadgeProps {
  plan: PlanTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const planColors: Record<PlanTier, string> = {
  DYNAMIC: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
  ENTERPRISE_CUSTOM: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
};

const planLabels: Record<PlanTier, string> = {
  DYNAMIC: "Ponto Fragata",
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
