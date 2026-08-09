import { useState, useMemo } from "react";
import { calculateDynamicPrice, PRICING, formatPrice } from "../../../shared/plans";
import { useNavigate } from "react-router";

interface PricingCalculatorProps {
  onCtaClick?: () => void;
}

export function PricingCalculator({ onCtaClick }: PricingCalculatorProps) {
  const navigate = useNavigate();
  const [employeeCount, setEmployeeCount] = useState(5);

  const pricing = useMemo(() => calculateDynamicPrice(employeeCount + 1), [employeeCount]);

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      navigate("/company/signup");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="text-center mb-8">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 mb-4">
          Plano Viggo
        </span>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-slate-800">{formatPrice(pricing.total)}</span>
          <span className="text-slate-500">/mês</span>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          {pricing.extraEmployees > 0
            ? `${pricing.baseMaxEmployees} base + ${pricing.extraEmployees} extra${pricing.extraEmployees > 1 ? "s" : ""}`
            : `Até ${pricing.baseMaxEmployees} funcionários incluídos`}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-700">
              Funcionários (além do admin)
            </label>
            <span className="text-sm font-bold text-slate-800">
              {employeeCount} {employeeCount === 1 ? "funcionário" : "funcionários"}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={employeeCount}
            onChange={(e) => setEmployeeCount(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400">1</span>
            <span className="text-xs text-slate-400">10</span>
            <span className="text-xs text-slate-400">25</span>
            <span className="text-xs text-slate-400">50</span>
            <span className="text-xs text-slate-400">100</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Preço base (até {PRICING.BASE_MAX_EMPLOYEES})</span>
            <span className="font-medium text-slate-700">{formatPrice(PRICING.BASE_PRICE)}</span>
          </div>
          {pricing.extraEmployees > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                {pricing.extraEmployees} extra{pricing.extraEmployees > 1 ? "s" : ""} × {formatPrice(PRICING.EXTRA_PRICE_PER_EMPLOYEE)}
              </span>
              <span className="font-medium text-slate-700">{formatPrice(pricing.extraTotal)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-2 flex justify-between">
            <span className="font-bold text-slate-800">Total</span>
            <span className="font-bold text-emerald-600 text-lg">{formatPrice(pricing.total)}/mês</span>
          </div>
        </div>

        <button
          onClick={handleCta}
          className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
        >
          Começar trial grátis
        </button>
        <p className="text-center text-xs text-slate-400">
          30 dias grátis, sem cartão de crédito. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
