import { useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
  words: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  loop?: boolean;
}

interface UseTypewriterReturn {
  currentText: string;
  isDeleting: boolean;
  currentWordIndex: number;
}

export function useTypewriter({
  words,
  typeSpeed = 80,
  deleteSpeed = 40,
  pauseDuration = 2000,
  loop = true,
}: UseTypewriterOptions): UseTypewriterReturn {
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tickRef = useRef<
    (text: string, deleting: boolean, wordIndex: number) => void
  >(undefined);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    tickRef.current = (text: string, deleting: boolean, wordIndex: number) => {
      const currentWord = words[wordIndex];
      const speed = deleting ? deleteSpeed : typeSpeed;

      const timeout = setTimeout(() => {
        if (deleting) {
          setCurrentText(currentWord.slice(0, text.length - 1));
          if (text.length > 1) {
            tickRef.current?.(text.slice(0, -1), true, wordIndex);
          } else {
            setIsDeleting(false);
            const nextIndex = (wordIndex + 1) % words.length;
            setCurrentWordIndex(nextIndex);
            if (!loop && nextIndex === 0) return;
            tickRef.current?.("", false, nextIndex);
          }
        } else {
          setCurrentText(currentWord.slice(0, text.length + 1));
          if (text.length < currentWord.length) {
            tickRef.current?.(text + currentWord[text.length], false, wordIndex);
          } else {
            const pause = setTimeout(() => {
              setIsDeleting(true);
              tickRef.current?.(currentWord, true, wordIndex);
            }, pauseDuration);
            timeoutsRef.current.push(pause);
          }
        }
      }, speed);

      timeoutsRef.current.push(timeout);
    };
  }, [words, typeSpeed, deleteSpeed, pauseDuration, loop]);

  useEffect(() => {
    if (words.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setTimeout(() => setCurrentText(words[0]), 0);
      return;
    }

    tickRef.current?.("", false, 0);

    return () => {
      clearTimeouts();
    };
  }, [words, typeSpeed, deleteSpeed, pauseDuration, loop]);

  return { currentText, isDeleting, currentWordIndex };
}