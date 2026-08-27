import { useEffect, useRef } from "react";

interface SmoothScrollOptions {
  /**
   * Coeficiente de amortecimento (peso e inércia do scroll).
   * Valores menores (ex: 0.05 - 0.075) dão uma sensação de scroll mais pesado e fluido.
   * Padrão: 0.065
   */
  damping?: number;
  /**
   * Multiplicador da intensidade da roda do mouse.
   * Padrão: 0.85
   */
  speed?: number;
  /**
   * Habilita ou desabilita o smooth scroll (ex: desabilitado durante o preloader).
   */
  enabled?: boolean;
}

export function useSmoothScroll({
  damping = 0.065,
  speed = 0.85,
  enabled = true,
}: SmoothScrollOptions = {}) {
  const targetY = useRef(0);
  const currentY = useRef(0);
  const rafId = useRef<number | null>(null);
  const isRunning = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      isRunning.current = false;
      return;
    }

    // Inicializa a posição com o scroll atual da página
    currentY.current = window.scrollY || window.pageYOffset;
    targetY.current = currentY.current;

    const getMaxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const update = () => {
      const diff = targetY.current - currentY.current;
      currentY.current += diff * damping;

      // Encerra quando o movimento for quase nulo
      if (Math.abs(diff) < 0.3) {
        currentY.current = targetY.current;
      }

      window.scrollTo(0, currentY.current);

      if (Math.abs(diff) >= 0.3) {
        rafId.current = requestAnimationFrame(update);
      } else {
        isRunning.current = false;
      }
    };

    const startAnimation = () => {
      if (!isRunning.current) {
        isRunning.current = true;
        rafId.current = requestAnimationFrame(update);
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Ignora se o evento veio de elementos com scroll interno (ex: listas com overflow-y-auto)
      let target = e.target as HTMLElement | null;
      let hasInternalScroll = false;

      while (target && target !== document.body && target !== document.documentElement) {
        const style = window.getComputedStyle(target);
        if (
          target.scrollHeight > target.clientHeight &&
          (style.overflowY === "auto" || style.overflowY === "scroll")
        ) {
          const atTop = target.scrollTop <= 0 && e.deltaY < 0;
          const atBottom =
            target.scrollTop + target.clientHeight >= target.scrollHeight - 1 &&
            e.deltaY > 0;
          if (!atTop && !atBottom) {
            hasInternalScroll = true;
            break;
          }
        }
        target = target.parentElement;
      }

      if (hasInternalScroll) return;

      e.preventDefault();

      const delta = e.deltaY * speed;
      targetY.current = Math.min(
        Math.max(0, targetY.current + delta),
        getMaxScroll()
      );

      startAnimation();
    };

    // Sincroniza se o usuário usar a barra de rolagem nativa ou atalhos
    const onScroll = () => {
      if (!isRunning.current) {
        currentY.current = window.scrollY || window.pageYOffset;
        targetY.current = currentY.current;
      }
    };

    // Intercepta âncoras para fazer rolagem suave ponderada
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (href && href !== "#") {
          const targetEl = document.querySelector(href);
          if (targetEl) {
            e.preventDefault();
            const headerOffset = 80;
            const elTop =
              targetEl.getBoundingClientRect().top +
              window.pageYOffset -
              headerOffset;
            targetY.current = Math.min(Math.max(0, elTop), getMaxScroll());
            startAnimation();
          }
        }
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
    };
  }, [damping, speed, enabled]);
}
