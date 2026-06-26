import { useState, useEffect, useRef, useCallback } from "react";

interface HeroMediaProps {
  className?: string;
}

export function HeroMedia({ className = "" }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const handleVideoLoad = useCallback(() => {
    setShowVideo(true);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    setShowVideo(false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoError) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.muted = true;
        video.play().catch(() => {
          setVideoError(true);
          setShowVideo(false);
        });
      });
    }
  }, [videoError]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const checkReducedMotion = () => mediaQuery.matches;

    const handler = () => {
      setPrefersReducedMotion(checkReducedMotion());
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (prefersReducedMotion || videoError) {
    return (
      <picture className={className}>
        <source
          srcSet="/celular.webp"
          type="image/webp"
          media="(min-width: 1024px)"
        />
        <source
          srcSet="/celular na mao.webp"
          type="image/webp"
          media="(max-width: 1023px)"
        />
        <img
          src="/celular na mao.webp"
          alt="Viggo - Controle de ponto com reconhecimento facial"
          className="w-full h-auto object-cover rounded-2xl shadow-xl"
          loading="eager"
          fetchPriority="high"
        />
      </picture>
    );
  }

  return (
    <picture className={className}>
      <source
        srcSet="/celular.webp"
        type="image/webp"
        media="(min-width: 1024px)"
      />
      <source
        srcSet="/celular na mao.webp"
        type="image/webp"
        media="(max-width: 1023px)"
      />
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster="/celular na mao.webp"
        onCanPlay={handleVideoLoad}
        onError={handleVideoError}
        className={`w-full h-auto object-cover rounded-2xl shadow-xl transition-opacity duration-500 ${
          showVideo ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Demonstração do reconhecimento facial do Viggo em dispositivo móvel"
      >
        <source src="/Gemini-Video.webm" type="video/webm" />
        <img
          src="/celular na mao.webp"
          alt="Viggo - Controle de ponto com reconhecimento facial"
          className="w-full h-auto object-cover rounded-2xl shadow-xl"
          loading="eager"
          fetchPriority="high"
        />
      </video>
    </picture>
  );
}