import { useEffect, useRef, useState } from 'react';

import { useReduceMotion } from './use-reduce-motion';

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Animates a displayed number from its previous value to `target`. Runs on
 * the JS thread via requestAnimationFrame — fine for a handful of on-screen
 * numbers, and avoids the Reanimated↔JS bridging an animated <Text> needs.
 */
export function useCountUp(target: number, duration = 900): number {
  const reduceMotion = useReduceMotion();
  const [display, setDisplay] = useState(reduceMotion ? target : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;

    if (reduceMotion || from === target) {
      const frame = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(frame);
    }

    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      setDisplay(from + (target - from) * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduceMotion]);

  return display;
}
