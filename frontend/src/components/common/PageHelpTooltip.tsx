import { useState, useRef, useEffect, useCallback } from "react";
import { HelpCircle, Info, X } from "lucide-react";

export interface PageHelpTooltipProps {
  text: string;
  title?: string;
  className?: string;
}

export function PageHelpTooltip({
  text,
  title = "Sobre esta tela",
  className = "",
}: PageHelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      // No mobile: fixo na tela, sempre dentro da viewport com margens laterais de 16px
      setPopoverStyle({
        position: "fixed",
        top: `${Math.min(rect.bottom + 8, window.innerHeight - 200)}px`,
        left: "16px",
        right: "16px",
        maxWidth: "calc(100vw - 32px)",
        margin: "0 auto",
        zIndex: 9999,
      });
    } else {
      // No desktop: se estiver próximo à borda direita, alinha à direita; caso contrário, à esquerda
      const spaceOnRight = window.innerWidth - rect.left;
      if (spaceOnRight < 340) {
        setPopoverStyle({
          position: "absolute",
          top: "100%",
          right: 0,
          left: "auto",
          marginTop: "8px",
          width: "320px",
          zIndex: 50,
        });
      } else {
        setPopoverStyle({
          position: "absolute",
          top: "100%",
          left: 0,
          right: "auto",
          marginTop: "8px",
          width: "320px",
          zIndex: 50,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Fecha o popover ao clicar fora ou rolar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleScroll() {
      if (isOpen && window.innerWidth < 640) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => {
        if (window.innerWidth >= 640) setIsOpen(true);
      }}
      onMouseLeave={() => {
        if (window.innerWidth >= 640) setIsOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Ajuda sobre esta página"
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 ${
          isOpen
            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105"
            : "bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200"
        }`}
      >
        <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
      </button>

      {/* Popover / Tooltip inteligente anti-vazamento */}
      {isOpen && (
        <div
          style={popoverStyle}
          className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/60 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Info className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-xs tracking-wide">
                {title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}
