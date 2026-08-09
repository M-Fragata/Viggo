import { useState, useEffect, useCallback } from 'react';

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
  autoPlayInterval = 4000,
  className = ''
}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!autoPlay || isPaused) return;
    const interval = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isPaused, goNext]);

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
        <div className="mb-6 rounded-xl bg-white/10 px-6 py-4">
          <p className="text-sm md:text-base text-on-dark leading-relaxed">
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
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500">
              <img
                src={currentSlide.image}
                alt={currentSlide.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Label do nome da página */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium text-white">
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
