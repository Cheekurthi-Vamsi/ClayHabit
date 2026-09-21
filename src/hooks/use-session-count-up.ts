import { useEffect, useState } from 'react';

import { useReduceMotion } from './use-reduce-motion';

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Last value shown per key, for the life of the app process. */
const lastShown = new Map<string, number>();

/**
 * Like `useCountUp`, but it remembers what was last shown under `key` for the
 * whole session. A number counts up from zero the first time it appears, and
 * on later visits it starts where it left off — so reopening a screen doesn't
 * replay the animation, while a real change (a new expense) still animates.
 * Pass `null` to skip animation entirely.
 */
export function useSessionCountUp(key: string | null, target: number, duration = 700): number {
  const reduceMotion = useReduceMotion();
  const [display, setDisplay] = useState(() =>
    key === null || reduceMotion ? target : (lastShown.get(key) ?? 0),
  );

  useEffect(() => {
    if (key === null) return;
    const from = lastShown.get(key) ?? 0;
    lastShown.set(key, target);

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
  }, [key, target, duration, reduceMotion]);

  return key === null ? target : display;
}
