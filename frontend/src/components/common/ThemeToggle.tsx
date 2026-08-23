import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, type ThemeMode } from "../../hooks/useTheme";

export interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

export function ThemeToggle({ className = "", size = "md", fullWidth = false }: ThemeToggleProps) {
  const { mode, setMode } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: "light", label: "Claro", icon: Sun },
    { mode: "system", label: "Sistema", icon: Laptop },
    { mode: "dark", label: "Escuro", icon: Moon },
  ];

  const sizeClasses =
    size === "sm"
      ? "p-1 text-[11px] gap-1"
      : "p-1.5 text-xs gap-1.5";

  return (
    <div
      className={`${
        fullWidth ? "grid grid-cols-3 w-full" : "inline-flex items-center"
      } bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl ${sizeClasses} ${className}`}
      role="group"
      aria-label="Seletor de tema"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            aria-pressed={isActive}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span className="text-[11px]">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
