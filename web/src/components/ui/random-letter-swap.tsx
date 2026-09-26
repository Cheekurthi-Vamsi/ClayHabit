import { useAnimate, useReducedMotion, type AnimationOptions } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

import './random-letter-swap.css';

interface RandomLetterSwapProps {
  label: string;
  className?: string;
  /** Letters leave upward by default; `reverse` sends them down. */
  reverse?: boolean;
  transition?: AnimationOptions;
  /** Delay between one letter and the next, in seconds. */
  staggerDuration?: number;
}

function shuffled(count: number): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * A label whose letters roll over one by one, in random order, on hover: each
 * letter slides out while its twin slides in. Only transforms move, inside a
 * clipped box of the letter's own size, so nothing around it ever shifts.
 *
 * It listens on the nearest link or button, so hovering anywhere on a nav
 * item plays it, and it stays still for people who prefer reduced motion.
 */
export function RandomLetterSwap({
  label,
  className,
  reverse = false,
  transition = { type: 'spring', duration: 0.7 },
  staggerDuration = 0.03,
}: RandomLetterSwapProps) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const reduceMotion = useReducedMotion();
  const busy = useRef(false);
  const letters = [...label];

  const play = useCallback(async () => {
    if (busy.current || reduceMotion || !scope.current) return;
    busy.current = true;
    const out = reverse ? '100%' : '-100%';
    const order = shuffled(letters.length);
    await Promise.all(
      order.flatMap((index, step) => {
        const delay = step * staggerDuration;
        return [
          animate(`[data-letter="${index}"] .rls__main`, { y: out }, { ...transition, delay }),
          animate(`[data-letter="${index}"] .rls__twin`, { y: '0%' }, { ...transition, delay }),
        ];
      }),
    );
    // Snap back while the twin (identical) is showing: invisible to the eye.
    await Promise.all([
      animate('.rls__main', { y: '0%' }, { duration: 0 }),
      animate('.rls__twin', { y: reverse ? '-100%' : '100%' }, { duration: 0 }),
    ]);
    busy.current = false;
  }, [animate, letters.length, reduceMotion, reverse, scope, staggerDuration, transition]);

  useEffect(() => {
    const node = scope.current;
    if (!node) return;
    const target = node.closest('a, button') ?? node;
    const onEnter = () => void play();
    target.addEventListener('mouseenter', onEnter);
    target.addEventListener('focus', onEnter);
    return () => {
      target.removeEventListener('mouseenter', onEnter);
      target.removeEventListener('focus', onEnter);
    };
  }, [play, scope]);

  return (
    <span ref={scope} className={`rls${className ? ` ${className}` : ''}`} aria-label={label}>
      {letters.map((letter, index) => {
        const glyph = letter === ' ' ? ' ' : letter;
        return (
          <span key={index} className="rls__letter" data-letter={index} aria-hidden>
            <span className="rls__main">{glyph}</span>
            <span className="rls__twin" style={{ transform: `translateY(${reverse ? '-100%' : '100%'})` }}>
              {glyph}
            </span>
          </span>
        );
      })}
    </span>
  );
}
