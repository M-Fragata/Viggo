import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { TextSplitter } from '../utils/textSplitter';

interface AnimatedTitleProps {
  text: string;
  className?: string;
}

export function AnimatedTitle({ text, className = '' }: AnimatedTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasAnimated = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!titleRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            setIsVisible(true);

            const splitter = new TextSplitter(titleRef.current!, {
              type: 'words',
              wordsClass: 'word'
            });
            const words = splitter.getElements();

            gsap.from(words, {
              opacity: 0,
              y: 20,
              stagger: 0.08,
              duration: 0.5,
              ease: 'power3.out'
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(titleRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <h2 ref={titleRef} className={`${className} ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      {text}
    </h2>
  );
}
