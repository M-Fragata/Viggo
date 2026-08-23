import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { TextSplitter } from '../utils/textSplitter';
import { TRIAL_DAYS } from '../../../shared/plans';
import TextType from './TextType';

const HERO_WORDS = [
  "reconhecimento facial",
  "geolocalização",
  "anti-fraude",
  "conformidade CLT",
];

interface HeroContentProps {
  startAnimation?: boolean;
}

export function HeroContent({ startAnimation = true }: HeroContentProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [showTypewriter, setShowTypewriter] = useState(false);

  useEffect(() => {
    if (!startAnimation) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.2 });

      // Split title by chars
      if (titleRef.current) {
        tl.fromTo(titleRef.current.closest("h1")!,
          { opacity: 0 },
          { opacity: 1, duration: 0.01 },
        );

        const titleSplitter = new TextSplitter(titleRef.current, {
          type: 'chars',
          charsClass: 'char'
        });
        const titleChars = titleSplitter.getElements();

        tl.fromTo(titleChars,
          { opacity: 0, y: 20, rotateX: -90 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            stagger: 0.02,
            duration: 0.6,
            clearProps: "transform",
          }
        );
      }

      // Fade in paragraph
      if (paragraphRef.current) {
        tl.fromTo(paragraphRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.01 },
        );

        const paraSplitter = new TextSplitter(paragraphRef.current, {
          type: 'words',
          wordsClass: 'word'
        });
        const paraWords = paraSplitter.getElements();

        tl.fromTo(paraWords,
          { opacity: 0, y: 15 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.03,
            duration: 0.4,
            clearProps: "transform",
          },
          '-=0.1'
        );
      }

      // Fade in buttons
      if (buttonsRef.current) {
        tl.fromTo(buttonsRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.01 },
        );

        tl.fromTo(buttonsRef.current.children,
          { opacity: 0, y: 20, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            stagger: 0.15,
            duration: 0.5,
            clearProps: "transform",
          },
          '-=0.1'
        );
      }

      // Start typewriter after all animations complete
      tl.call(() => setShowTypewriter(true));
    });

    return () => ctx.revert();
  }, [startAnimation]);

  return (
    <div className="text-center max-w-3xl flex flex-col items-center gap-5">
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-on-dark leading-[1.1] opacity-0">
        <span ref={titleRef}>Controle de ponto com</span>
        <br />
        <span className="text-brand-green inline-block min-h-[1.2em]">
          {showTypewriter ? (
            <TextType
              text={HERO_WORDS}
              className="text-brand-green"
              typingSpeed={80}
              deletingSpeed={40}
              pauseDuration={2000}
              loop={true}
              showCursor={true}
              cursorCharacter="|"
              cursorClassName="text-brand-green-deep"
            />
          ) : (
            <span className="opacity-0">.</span>
          )}
        </span>
      </h1>
      <p
        ref={paragraphRef}
        className="mt-6 text-lg leading-relaxed text-on-dark opacity-0"
      >
        Elimine fraudes, ganhe agilidade e tenha total conformidade legal.
        Setup em minutos, sem hardware extra.
      </p>
      <div ref={buttonsRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 opacity-0 w-full sm:w-auto">
        <Link
          to="/company/signup"
          className="w-full sm:w-auto rounded-full bg-brand-green px-6 sm:px-8 py-3.5 text-sm font-semibold text-black hover:bg-brand-green-deep transition-all shadow-lg shadow-brand-green/20 text-center"
        >
          Começar trial de {TRIAL_DAYS} dias
        </Link>
        <a
          href="https://wa.me/5521966921215?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20Viggo%20e%20tirar%20algumas%20d%C3%BAvidas."
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-md px-6 sm:px-7 py-3.5 text-sm font-medium text-on-dark hover:bg-white/[0.08] hover:border-brand-green/50 hover:text-brand-green transition-all"
        >
          <svg className="w-4 h-4 fill-current text-emerald-400" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span>Falar com especialista</span>
        </a>
      </div>
    </div>
  );
}
