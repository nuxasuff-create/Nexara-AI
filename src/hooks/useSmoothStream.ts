import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to smoothly animate streaming text token-by-token at ~60fps,
 * preventing abrupt chunk jumps and providing a fluid typewriter effect.
 */
export function useSmoothStream(targetText: string, isActive: boolean) {
  const [displayedText, setDisplayedText] = useState(targetText);
  const animFrameRef = useRef<number | null>(null);
  const currentLenRef = useRef<number>(targetText ? targetText.length : 0);

  useEffect(() => {
    // If not actively streaming or if target text is reset/empty, sync immediately
    if (!isActive || !targetText) {
      setDisplayedText(targetText);
      currentLenRef.current = targetText ? targetText.length : 0;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const animateStep = () => {
      const targetLen = targetText.length;
      const curLen = currentLenRef.current;

      if (curLen < targetLen) {
        // Calculate smooth catch-up delta (at least 1 char, up to 30% of remaining diff per frame)
        const diff = targetLen - curLen;
        const stepSize = Math.max(1, Math.min(diff, Math.ceil(diff * 0.35)));
        const nextLen = curLen + stepSize;
        currentLenRef.current = nextLen;
        setDisplayedText(targetText.slice(0, nextLen));
        animFrameRef.current = requestAnimationFrame(animateStep);
      } else {
        setDisplayedText(targetText);
        animFrameRef.current = null;
      }
    };

    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(animateStep);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [targetText, isActive]);

  return displayedText;
}
