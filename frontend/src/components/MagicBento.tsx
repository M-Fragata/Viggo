import React, { useRef, useEffect, useState, type ReactNode } from 'react';
import { motion, type PanInfo } from 'framer-motion';

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  icon?: ReactNode;
  tags?: string[];
  colSpan?: string;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface BentoProps {
  cards?: BentoCardProps[];
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  className?: string;
}

const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '0, 212, 164'; // Viggo brand green
const MOBILE_BREAKPOINT = 768;

const defaultCardData: BentoCardProps[] = [
  {
    color: '#0d1117',
    title: 'Reconhecimento Facial',
    description: 'Validação biométrica com prova de vida em menos de 1 segundo.',
    label: 'Anti-Fraude IA'
  },
  {
    color: '#0d1117',
    title: 'Cerca Virtual GPS',
    description: 'Delimite perímetros exatos e audite a localização em mapa.',
    label: 'Precisão GPS'
  },
  {
    color: '#0d1117',
    title: 'Cálculo Automático',
    description: 'Horas extras, adicionais noturnos e atrasos sem planilhas.',
    label: 'Automação RH'
  },
  {
    color: '#0d1117',
    title: 'Portaria 671 MTE',
    description: 'REP-P homologado com assinatura digital e arquivos fiscais.',
    label: 'Conformidade'
  },
  {
    color: '#0d1117',
    title: 'App ou Modo Totem',
    description: 'No celular de cada equipe ou em tablet fixado na recepção.',
    label: 'Flexibilidade'
  },
  {
    color: '#0d1117',
    title: 'Fechamento em 1 Clique',
    description: 'Exportação direta para os principais softwares contábeis.',
    label: 'Integração'
  }
];

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.85
});

const updateCardGlowProperties = (card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (disableAnimations || !gridRef.current || !enabled) return;

    const grid = gridRef.current;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: ${spotlightRadius * 2}px;
      height: ${spotlightRadius * 2}px;
      border-radius: 50%;
      background: radial-gradient(circle, 
        rgba(${glowColor}, 0.18) 0%, 
        rgba(${glowColor}, 0.09) 25%, 
        rgba(${glowColor}, 0.03) 50%, 
        transparent 70%
      );
      pointer-events: none;
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const updateGlow = () => {
      if (!grid) return;

      const gridRect = grid.getBoundingClientRect();
      const margin = 100;
      const isNearGrid = (
        lastMousePos.current.x >= gridRect.left - margin &&
        lastMousePos.current.x <= gridRect.right + margin &&
        lastMousePos.current.y >= gridRect.top - margin &&
        lastMousePos.current.y <= gridRect.bottom + margin
      );

      const cards = grid.querySelectorAll<HTMLElement>('.card');

      if (!isNearGrid) {
        if (spotlightRef.current) spotlightRef.current.style.opacity = '0';
        cards.forEach(card => card.style.setProperty('--glow-intensity', '0'));
        return;
      }

      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = '1';
        spotlightRef.current.style.left = `${lastMousePos.current.x}px`;
        spotlightRef.current.style.top = `${lastMousePos.current.y}px`;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        // Ponto mais próximo no retângulo do card (corrige a física para cards retangulares largos)
        const nearestX = Math.max(rect.left, Math.min(lastMousePos.current.x, rect.right));
        const nearestY = Math.max(rect.top, Math.min(lastMousePos.current.y, rect.bottom));

        const distance = Math.hypot(
          lastMousePos.current.x - nearestX,
          lastMousePos.current.y - nearestY
        );

        if (distance <= proximity) {
          updateCardGlowProperties(card, lastMousePos.current.x, lastMousePos.current.y, 1, spotlightRadius);
        } else if (distance <= fadeDistance) {
          const glow = (fadeDistance - distance) / (fadeDistance - proximity);
          updateCardGlowProperties(card, lastMousePos.current.x, lastMousePos.current.y, glow, spotlightRadius);
        } else {
          updateCardGlowProperties(card, lastMousePos.current.x, lastMousePos.current.y, 0, spotlightRadius);
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updateGlow);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (spotlightRef.current) {
        spotlightRef.current.remove();
      }
    };
  }, [disableAnimations, gridRef, enabled, spotlightRadius, glowColor]);

  return null;
};

const BentoCardGrid: React.FC<{
  children: React.ReactNode;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}> = ({ children, gridRef, className = '' }) => (
  <div
    className={`bento-section grid gap-4 p-2 max-w-7xl mx-auto select-none relative ${className}`}
    ref={gridRef}
  >
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Hook para detectar quantos cards mostrar por vez em telas < 1024px
const useItemsPerPage = () => {
  const [itemsPerPage, setItemsPerPage] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 640 && width < 1024) {
        setItemsPerPage(2); // ~1024px / tablets: exatamente 2 cards lado a lado
      } else {
        setItemsPerPage(1); // mobile (< 640px): exatamente 1 card
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return itemsPerPage;
};

export const MagicBento: React.FC<BentoProps> = ({
  cards = defaultCardData,
  //enableStars = false,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
  className = ''
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = useItemsPerPage();

  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  // Limite máximo de índice do slider
  const maxIndex = Math.max(0, cards.length - itemsPerPage);

  // Garante que o índice não passe do máximo ao redimensionar a tela
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [itemsPerPage, maxIndex, currentIndex]);

  // Gestos de arrasto com touch ou mouse (swipe slider)
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 35;
    const velocityThreshold = 200;

    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      // Arrastou para a esquerda -> próximo
      setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      // Arrastou para a direita -> anterior
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldDisableAnimations) return;
    const card = e.currentTarget;
    updateCardGlowProperties(card, e.clientX, e.clientY, 1, spotlightRadius);
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldDisableAnimations) return;
    const card = e.currentTarget;
    card.style.setProperty('--glow-intensity', '0');
  };

  const renderCardContent = (card: BentoCardProps) => (
    <>
      <div className="flex items-center justify-between gap-3 relative mb-4 z-10">
        <span className="text-xs font-semibold text-brand-green uppercase tracking-wider bg-brand-green/10 px-3 py-1 rounded-full border border-brand-green/20">
          {card.label}
        </span>
        {card.icon && (
          <div className="text-brand-green p-2 rounded-xl bg-white/[0.03] border border-white/5">
            {card.icon}
          </div>
        )}
      </div>
      <div className="flex flex-col relative mt-auto z-10">
        <h3 className="font-bold text-xl sm:text-2xl text-slate-900 dark:text-on-dark m-0 mb-2">
          {card.title}
        </h3>
        <p className="text-sm sm:text-base text-slate-600 dark:text-on-dark-muted leading-relaxed">
          {card.description}
        </p>
        {card.tags && (
          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-white/5">
            {card.tags.map((tag, idx) => (
              <span key={idx} className="text-xs text-slate-600 dark:text-on-dark-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`w-full relative ${className}`}>
      <style>
        {`
          .bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: ${spotlightRadius}px;
            --glow-color: ${glowColor};
            --border-color: rgba(255, 255, 255, 0.08);
            --background-dark: rgba(255, 255, 255, 0.02);
            --white: #ffffff;
            --brand-glow: rgba(${glowColor}, 0.2);
            --brand-border: rgba(${glowColor}, 0.8);
          }
          
          .card--border-glow::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.12)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.04)) 40%,
                transparent 70%);
            border-radius: inherit;
            pointer-events: none;
            opacity: 1;
            z-index: 0;
            transition: opacity 0.2s ease;
          }

          .card--border-glow::after {
            content: '';
            position: absolute;
            inset: 0;
            padding: 1.5px;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 1)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.5)) 35%,
                transparent 65%);
            border-radius: inherit;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.2s ease;
            z-index: 1;
          }
          
          .card--border-glow:hover {
            box-shadow: 0 10px 30px -5px rgba(${glowColor}, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
          }

          .dark .card--border-glow:hover {
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 35px rgba(${glowColor}, 0.25);
          }
        `}
      </style>

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        {/* ── DESKTOP: Grid Layout (>= 1024px) ── */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-5 w-full">
          {cards.map((card, index) => {
            const baseClassName = `card flex flex-col justify-between relative min-h-[240px] w-full p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-white/10 font-normal overflow-hidden transition-all duration-300 ease-in-out bg-white dark:bg-white/[0.025] shadow-sm hover:shadow-md dark:shadow-none backdrop-blur-sm ${card.colSpan || ''} ${enableBorderGlow ? 'card--border-glow' : ''}`;

            const cardStyle = {
              '--glow-x': '50%',
              '--glow-y': '50%',
              '--glow-intensity': '0',
              '--glow-radius': `${spotlightRadius}px`
            } as React.CSSProperties;

            return (
              <div
                key={`desktop-${index}`}
                className={baseClassName}
                style={cardStyle}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                {renderCardContent(card)}
              </div>
            );
          })}
        </div>

        {/* ── MOBILE / TABLET: Framer Motion Swipe Slider (< 1024px) ── */}
        <div className="w-full lg:hidden overflow-hidden">
          <div className="w-full overflow-hidden relative">
            <motion.div
              className="flex cursor-grab active:cursor-grabbing select-none"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {cards.map((card, index) => {
                const cardStyle = {
                  '--glow-x': '50%',
                  '--glow-y': '50%',
                  '--glow-intensity': '0',
                  '--glow-radius': `${spotlightRadius}px`
                } as React.CSSProperties;

                return (
                  <div
                    key={`slider-${index}`}
                    className={`shrink-0 px-2 box-border ${
                      itemsPerPage === 2 ? 'w-1/2' : 'w-full'
                    }`}
                  >
                    <div
                      className={`card flex flex-col justify-between relative min-h-[270px] w-full p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-white/10 font-normal overflow-hidden transition-all duration-300 bg-white dark:bg-white/[0.025] shadow-sm hover:shadow-md dark:shadow-none backdrop-blur-sm ${
                        enableBorderGlow ? 'card--border-glow' : ''
                      }`}
                      style={cardStyle}
                      onMouseMove={handleCardMouseMove}
                      onMouseLeave={handleCardMouseLeave}
                    >
                      {renderCardContent(card)}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Pagination Dots (Sincronizadas com os cards que estão visíveis na tela) */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {cards.map((_, index) => {
              // No tablet (2 cards), ambas as bolinhas dos cards visíveis ficam verdes
              // No mobile (1 card), a bolinha do card visível fica verde
              const isVisible = index >= currentIndex && index < currentIndex + itemsPerPage;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentIndex(Math.min(index, maxIndex))}
                  className={`h-2.5 transition-all duration-300 rounded-full cursor-pointer ${
                    isVisible
                      ? 'w-6 bg-brand-green shadow-sm shadow-brand-green/40'
                      : 'w-2.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
                  }`}
                  aria-label={`Ir para o card ${index + 1}`}
                />
              );
            })}
          </div>
        </div>
      </BentoCardGrid>
    </div>
  );
};

export default MagicBento;
