import React from "react";
import { PageHelpTooltip } from "./PageHelpTooltip";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  helpText?: string;
  helpTitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  helpText,
  helpTitle,
  badge,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#111113] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm mb-6 transition-colors ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {title}
          </h1>
          {helpText && (
            <PageHelpTooltip
              text={helpText}
              title={helpTitle || `Sobre: ${title}`}
            />
          )}
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
