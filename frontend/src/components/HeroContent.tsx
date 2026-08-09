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
      <div ref={buttonsRef} className="mt-10 flex flex-row items-center justify-center gap-4 opacity-0">
        <Link
          to="/company/signup"
          className="rounded-full bg-black px-4 lg:px-8 py-3.5 text-sm font-medium text-white
          border border-black
          hover:border-on-dark
          hover:bg-brand-green-deep transition-colors"
        >
          Começar trial de {TRIAL_DAYS} dias
        </Link>
        <Link
          to="/"
          className="rounded-full border border-black bg-white px-2 lg:px-8 py-3.5 text-sm font-medium text-black hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark transition-colors"
        >
          Já tenho conta
        </Link>
      </div>
    </div>
  );
}
