import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { TextSplitter } from "../utils/textSplitter";

interface PreloaderProps {
  onComplete: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!containerRef.current || !titleRef.current) return;

    const tl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false);
        onCompleteRef.current();
      }
    });

    tl.fromTo(containerRef.current.querySelector("h1"),
      { opacity: 0 },
      { opacity: 1, duration: 0.01 },
    );

    const titleSplitter = new TextSplitter(titleRef.current, {
      type: "chars",
      charsClass: "char",
    });
    const chars = titleSplitter.getElements();

    tl.fromTo(chars,
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: "power3.out",
      },
      "-=0.01"
    );

    tl.to(chars, {
      opacity: 0,
      y: -10,
      stagger: 0.05,
      duration: 0.4,
      ease: "power3.in",
      delay: 0.6,
    });

    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 0.8,
      ease: "power3.inOut",
    });
  }, []);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
    >
      <h1
        ref={titleRef}
        className="text-5xl md:text-7xl font-bold tracking-widest text-white opacity-0"
      >
        VIGGO
      </h1>
    </div>
  );
}
