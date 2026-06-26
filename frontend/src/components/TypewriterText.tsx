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
  className = "",
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
    <span className={className} aria-live="polite" aria-atomic="true">
      {currentText}
      {showCursor && (
        <span
          className={`inline-block w-px h-6 align-bottom animate-pulse bg-current ${cursorClassName}`}
          aria-hidden="true"
        >
          &#8203;
        </span>
      )}
    </span>
  );
}