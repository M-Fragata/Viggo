import { useMemo } from "react";
import { Check, X } from "lucide-react";

export interface PasswordStrengthIndicatorProps {
  password: string;
  confirmPassword?: string;
  showCriteria?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  confirmPassword,
  showCriteria = true,
}: PasswordStrengthIndicatorProps) {
  const criteria = useMemo(() => {
    return [
      {
        id: "min-length",
        label: "Mínimo de 8 caracteres",
        valid: password.length >= 8,
      },
      {
        id: "has-letter-and-number",
        label: "Contém letras e números",
        valid: /[a-zA-Z]/.test(password) && /[0-9]/.test(password),
      },
      {
        id: "match-confirm",
        label: "Senhas coincidem",
        valid: confirmPassword !== undefined && confirmPassword.length > 0 && password === confirmPassword,
        hideWhenNoConfirm: true,
      },
    ];
  }, [password, confirmPassword]);

  const score = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s += 1;
    if (password.length >= 12) s += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s += 1;
    if (/[0-9]/.test(password)) s += 1;
    if (/[^A-Za-z0-9]/.test(password)) s += 1;
    return s;
  }, [password]);

  const strengthConfig = useMemo(() => {
    if (!password) return { label: "Digite uma senha", color: "bg-white/10", width: "0%", textColor: "text-stone" };
    if (score <= 1) return { label: "Muito fraca", color: "bg-red-500", width: "20%", textColor: "text-red-400" };
    if (score === 2) return { label: "Fraca", color: "bg-orange-500", width: "40%", textColor: "text-orange-400" };
    if (score === 3) return { label: "Razoável", color: "bg-amber-400", width: "65%", textColor: "text-amber-400" };
    if (score === 4) return { label: "Forte", color: "bg-brand-green", width: "85%", textColor: "text-brand-green" };
    return { label: "Excelente", color: "bg-emerald-400", width: "100%", textColor: "text-emerald-400" };
  }, [password, score]);

  if (!password && !confirmPassword) return null;

  return (
    <div className="w-full space-y-2.5 pt-1 animate-in fade-in duration-200">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-on-dark-muted font-medium">Força da senha</span>
          <span className={`font-semibold ${strengthConfig.textColor}`}>
            {strengthConfig.label}
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${strengthConfig.color}`}
            style={{ width: strengthConfig.width }}
          />
        </div>
      </div>

      {/* Criteria Checklist */}
      {showCriteria && (
        <ul className="space-y-1 text-xs pt-1">
          {criteria.map((item) => {
            if (item.hideWhenNoConfirm && confirmPassword === undefined) return null;
            return (
              <li
                key={item.id}
                className={`flex items-center gap-1.5 transition-colors duration-150 ${
                  item.valid ? "text-brand-green" : "text-stone"
                }`}
              >
                {item.valid ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 shrink-0 opacity-40" />
                )}
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
