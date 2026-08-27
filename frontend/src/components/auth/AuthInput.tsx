import React, { forwardRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  rightElement?: React.ReactNode;
  isSuccess?: boolean;
  isPassword?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      rightElement,
      isSuccess,
      isPassword = false,
      type = "text",
      className = "",
      id,
      name,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || name;

    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full space-y-1.5 group">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-on-dark-muted transition-colors group-focus-within:text-brand-green"
            >
              {label}
            </label>
            {helperText && !error && (
              <span className="text-[11px] text-slate-400 dark:text-stone">{helperText}</span>
            )}
          </div>
        )}

        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-stone group-focus-within:text-brand-green transition-colors duration-200">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            type={inputType}
            disabled={disabled}
            aria-invalid={!!error}
            className={`w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:focus:bg-white/[0.09] text-slate-900 dark:text-on-dark placeholder:text-slate-400 dark:placeholder:text-stone text-sm rounded-xl py-3 border transition-all duration-200 outline-none
              ${Icon ? "pl-10" : "pl-4"}
              ${isPassword || rightElement || error || isSuccess ? "pr-11" : "pr-4"}
              ${
                error
                  ? "border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-500/[0.02]"
                  : isSuccess
                  ? "border-emerald-500/60 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  : "border-slate-200 dark:border-white/10 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${className}
            `}
            {...props}
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                className="p-1 rounded-lg text-slate-400 dark:text-stone hover:text-slate-800 dark:hover:text-on-dark transition-colors cursor-pointer focus:outline-none focus:text-brand-green"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {!isPassword && isSuccess && !rightElement && (
              <CheckCircle2 className="w-4 h-4 text-brand-green" />
            )}

            {!isPassword && error && !rightElement && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}

            {rightElement}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
