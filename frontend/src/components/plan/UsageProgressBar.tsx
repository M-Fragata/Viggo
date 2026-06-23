interface UsageProgressBarProps {
  current: number;
  limit: number | null;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
}

export function UsageProgressBar({ current, limit, label, showPercentage = true, size = "md" }: UsageProgressBarProps) {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / limit!) * 100));
  const remaining = isUnlimited ? null : Math.max(0, limit! - current);

  const getColor = () => {
    if (isUnlimited) return "emerald";
    if (percentage >= 90) return "red";
    if (percentage >= 70) return "amber";
    return "emerald";
  };

  const color = getColor();
  const colorClasses = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex justify-between items-center">
          <span className={`font-medium ${textSizeClasses[size]} text-slate-700`}>{label}</span>
          <span className={`font-mono font-semibold ${textSizeClasses[size]} text-slate-600`}>
            {isUnlimited ? `∞` : `${current} / ${limit}`}
            {showPercentage && !isUnlimited && ` (${percentage}%)`}
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: isUnlimited ? "100%" : `${percentage}%` }}
        />
      </div>
      {!isUnlimited && remaining !== null && remaining <= limit! * 0.1 && remaining > 0 && (
        <p className={`text-xs text-amber-600 font-medium ${textSizeClasses[size]}`}>
          Atenção: apenas {remaining} vaga{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
        </p>
      )}
      {isUnlimited && (
        <p className={`text-xs text-emerald-600 font-medium ${textSizeClasses[size]}`}>
          Plano ilimitado
        </p>
      )}
    </div>
  );
}