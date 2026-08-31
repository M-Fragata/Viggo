import { useState, useEffect } from "react";
import { formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrialCountdownProps {
  planExpiresAt: string | null;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  size?: "sm" | "md" | "lg";
}

export function TrialCountdown({ planExpiresAt, status, size = "md" }: TrialCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!planExpiresAt || status !== "TRIAL") return;

    const updateTimeLeft = () => {
      const expiresAt = new Date(planExpiresAt);
      if (isPast(expiresAt)) {
        setTimeLeft("Expirado");
        return;
      }
      setTimeLeft(formatDistanceToNow(expiresAt, { addSuffix: true, locale: ptBR }));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [planExpiresAt, status]);

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const iconSize = { sm: 12, md: 14, lg: 16 };

  if (status === "TRIAL" && planExpiresAt) {
    const expired = isPast(new Date(planExpiresAt));
    return (
      <div
        className={`inline-flex items-center gap-1.5 font-medium rounded-xl border ${
          expired
            ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
        } ${sizeClasses[size]}`}
      >
        <svg
          className={`shrink-0 ${expired ? "text-red-500" : "text-emerald-500 dark:text-emerald-400"}`}
          width={iconSize[size]}
          height={iconSize[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>{expired ? "Trial expirado" : `${timeLeft} restantes`}</span>
      </div>
    );
  }

  if (status === "ACTIVE" && planExpiresAt) {
    const renewalDate = new Date(planExpiresAt);
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium rounded-xl border bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 ${sizeClasses[size]}`}>
        <svg
          className="shrink-0 text-blue-500 dark:text-blue-400"
          width={iconSize[size]}
          height={iconSize[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Renova em {renewalDate.toLocaleDateString("pt-BR")}</span>
      </div>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium rounded-xl border bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 ${sizeClasses[size]}`}>
        <svg
          className="shrink-0 text-amber-500 dark:text-amber-400"
          width={iconSize[size]}
          height={iconSize[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>Suspensa</span>
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium rounded-xl border bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20 ${sizeClasses[size]}`}>
        <svg
          className="shrink-0 text-red-500 dark:text-red-400"
          width={iconSize[size]}
          height={iconSize[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>Cancelada</span>
      </div>
    );
  }

  return null;
}