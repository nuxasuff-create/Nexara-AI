import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to smoothly animate streaming text token-by-token,
 * using throttled batch updates to avoid CPU starvation and UI lag.
 */
export function useSmoothStream(targetText: string, isActive: boolean) {
  const [displayedText, setDisplayedText] = useState(targetText);
  const animFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const currentLenRef = useRef<number>(targetText ? targetText.length : 0);

  useEffect(() => {
    // If not actively streaming or target text is reset/empty, sync immediately
    if (!isActive || !targetText) {
      setDisplayedText(targetText);
      currentLenRef.current = targetText ? targetText.length : 0;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const animateStep = (timestamp: number) => {
      const targetLen = targetText.length;
      const curLen = currentLenRef.current;

      // Throttle updates to ~30ms to allow React/Markdown parsing breathing room
      if (timestamp - lastUpdateRef.current >= 28 || curLen >= targetLen - 2) {
        lastUpdateRef.current = timestamp;

        if (curLen < targetLen) {
          const diff = targetLen - curLen;
          const stepSize = diff > 100 ? 25 : diff > 40 ? 10 : Math.max(2, Math.ceil(diff * 0.5));
          const nextLen = Math.min(targetLen, curLen + stepSize);
          currentLenRef.current = nextLen;
          setDisplayedText(targetText.slice(0, nextLen));

          if (nextLen < targetLen) {
            animFrameRef.current = requestAnimationFrame(animateStep);
          } else {
            animFrameRef.current = null;
          }
        } else {
          animFrameRef.current = null;
        }
      } else {
        animFrameRef.current = requestAnimationFrame(animateStep);
      }
    };

    if (currentLenRef.current < targetText.length && !animFrameRef.current) {
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

