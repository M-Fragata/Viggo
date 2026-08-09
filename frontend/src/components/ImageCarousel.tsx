import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { TextSplitter } from '../utils/textSplitter';

export interface CarouselSlide {
  image: string;
  title: string;
  description: string;
}

interface ImageCarouselProps {
  slides: CarouselSlide[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

export function ImageCarousel({
  slides,
  autoPlay = true,
  autoPlayInterval = 5000,
  className = ''
}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [descriptionKey, setDescriptionKey] = useState(0);

  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const isFirstRender = useRef(true);

  const goTo = useCallback((index: number) => {
    if (isAnimating || index === activeIndex) return;
    setActiveIndex(index);
  }, [isAnimating, activeIndex]);

  const goNext = useCallback(() => {
    if (isAnimating) return;
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length, isAnimating]);

  const goPrev = useCallback(() => {
    if (isAnimating) return;
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length, isAnimating]);

  useEffect(() => {
    if (!autoPlay || isPaused || isAnimating) return;
    const interval = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isPaused, goNext, isAnimating]);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsAnimating(true);

    // Force description to re-render with new content
    setDescriptionKey(prev => prev + 1);

    const tl = gsap.timeline({
      onComplete: () => setIsAnimating(false)
    });

    // Fade out image
    if (imageContainerRef.current) {
      tl.to(imageContainerRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in'
      });
    }

    // Fade in image
    if (imageContainerRef.current) {
      tl.fromTo(imageContainerRef.current,
        { opacity: 0, scale: 1.05 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
      );
    }

    // Fade in title
    if (titleRef.current) {
      tl.from(titleRef.current, {
        opacity: 0,
        x: -10,
        duration: 0.3,
        ease: 'power2.out'
      }, '-=0.3');
    }

    return () => {
      tl.kill();
    };
  }, [activeIndex]);

  // Separate effect for description split words animation
  useEffect(() => {
    if (isFirstRender.current || !descriptionRef.current) return;

    // Wait for React to render the new text, then split and animate
    const timeout = setTimeout(() => {
      if (!descriptionRef.current) return;

      const splitter = new TextSplitter(descriptionRef.current, {
        type: 'words',
        wordsClass: 'word'
      });
      const words = splitter.getElements();

      gsap.from(words, {
        opacity: 0,
        y: 15,
        stagger: 0.03,
        duration: 0.3,
        ease: 'power2.out'
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [descriptionKey]);

  const getSlideIndex = (offset: number) => {
    return (activeIndex + offset + slides.length) % slides.length;
  };

  const currentSlide = slides[activeIndex];

  return (
    <div
      className={`relative w-full mx-auto ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Container principal */}
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 md:p-8">

        {/* Texto explicativo */}
        <div className="mb-6 rounded-xl bg-white/10 px-6 py-4 min-h-[80px]">
          <p
            ref={descriptionRef}
            className="text-sm md:text-base text-on-dark leading-relaxed"
          >
            {currentSlide.description}
          </p>
        </div>

        {/* Carrossel de imagens */}
        <div className="relative flex items-center justify-center gap-2 md:gap-4 h-[300px] md:h-[450px]">

          {/* Imagem lateral esquerda */}
          <button
            onClick={goPrev}
            className="hidden md:flex flex-shrink-0 w-[15%] h-[70%] items-center justify-center cursor-pointer group"
            aria-label="Slide anterior"
          >
            <div className="w-full h-full rounded-2xl overflow-hidden opacity-40 scale-90 transition-all duration-500 group-hover:opacity-60 group-hover:scale-95">
              <img
                src={slides[getSlideIndex(-1)].image}
                alt={slides[getSlideIndex(-1)].title}
                className="w-full h-full object-cover"
              />
            </div>
          </button>

          {/* Imagem central */}
          <div className="flex-shrink-0 w-full md:w-[55%] h-full relative">
            <div
              ref={imageContainerRef}
              className="w-full h-full rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={currentSlide.image}
                alt={currentSlide.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Label do nome da página */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
              <span
                ref={titleRef}
                className="text-sm font-medium text-white"
              >
                {currentSlide.title}
              </span>
            </div>
          </div>

          {/* Imagem lateral direita */}
          <button
            onClick={goNext}
            className="hidden md:flex flex-shrink-0 w-[15%] h-[70%] items-center justify-center cursor-pointer group"
            aria-label="Próximo slide"
          >
            <div className="w-full h-full rounded-2xl overflow-hidden opacity-40 scale-90 transition-all duration-500 group-hover:opacity-60 group-hover:scale-95">
              <img
                src={slides[getSlideIndex(1)].image}
                alt={slides[getSlideIndex(1)].title}
                className="w-full h-full object-cover"
              />
            </div>
          </button>
        </div>

        {/* Dots de navegação */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-8 h-2 bg-brand-green'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
