import { useTypewriter } from "../hooks/useTypewriter";

interface TypewriterTextProps {
  words: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  loop?: boolean;
  showCursor?: boolean;
  cursorClassName?: string;
}

export function TypewriterText({
  words,
  typeSpeed,
  deleteSpeed,
  pauseDuration,
  loop = true,
  showCursor = true,
  cursorClassName = "",
}: TypewriterTextProps) {
  const { currentText } = useTypewriter({
    words,
    typeSpeed,
    deleteSpeed,
    pauseDuration,
    loop,
  });

  return (
    <span className={`className`} aria-live="polite" aria-atomic="true">
      {currentText}
      {showCursor && (
        <span
          className={`inline-block w-[4px] h-[1em] align-middle mx-2 rounded-full animate-pulse bg-current ${cursorClassName}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}