import { useEffect, useRef } from "react";

type RevealDirection = "up" | "left" | "right" | "scale";

const SELECTORS = [
  '[data-reveal="up"]',
  '[data-reveal="left"]',
  '[data-reveal="right"]',
  '[data-reveal="scale"]',
  '[data-parallax]',
].join(",");

function getTransformForDirection(
  direction: RevealDirection,
  progress: number,
): string {
  const eased = 1 - Math.pow(1 - progress, 3);
  switch (direction) {
    case "up":
      return `translateY(${(1 - eased) * 40}px)`;
    case "left":
      return `translateX(${(1 - eased) * -60}px)`;
    case "right":
      return `translateX(${(1 - eased) * 60}px)`;
    case "scale":
      return `scale(${0.92 + eased * 0.08})`;
  }
}

function initRevealElements(elements: HTMLElement[]) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
  );

  for (const el of elements) {
    el.style.opacity = "0";
    el.style.willChange = "transform, opacity";
    observer.observe(el);
  }

  return observer;
}

function startParallaxLoop(
  elements: HTMLElement[],
  rafId: { current: number },
) {
  const parallaxElements = elements.filter((el) => el.dataset.parallax);

  function onScroll() {
    rafId.current = requestAnimationFrame(() => {
      const vh = window.innerHeight;

      for (const el of parallaxElements) {
        const speed = parseFloat(el.dataset.parallax ?? "0.3");
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (center - vh / 2) * speed;
        el.style.transform = `translateY(${-offset}px)`;
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}

function startRevealLoop(
  elements: HTMLElement[],
  rafId: { current: number },
) {
  function onScroll() {
    rafId.current = requestAnimationFrame(() => {
      for (const el of elements) {
        if (!el.classList.contains("is-visible")) continue;

        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const progress = Math.min(1, Math.max(0, 1 - rect.top / vh));

        const dir = (el.dataset.reveal ?? "up") as RevealDirection;
        el.style.opacity = String(Math.min(1, progress * 2));
        el.style.transform = getTransformForDirection(dir, progress);
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}

export function useScrollReveal() {
  const rafId = useRef(0);

  useEffect(() => {
    if (CSS.supports && CSS.supports("animation-timeline", "view()")) {
      return;
    }

    const container = document.querySelector<HTMLElement>("main");
    if (!container) return;

    const nodeList = container.querySelectorAll<HTMLElement>(SELECTORS);
    const elements = Array.from(nodeList);
    const observer = initRevealElements(elements);
    const cleanupScroll = startRevealLoop(elements, rafId);
    const cleanupParallax = startParallaxLoop(elements, rafId);
    const currentRafId = rafId.current;

    return () => {
      cancelAnimationFrame(currentRafId);
      observer.disconnect();
      cleanupScroll();
      cleanupParallax();
    };
  }, []);
}
