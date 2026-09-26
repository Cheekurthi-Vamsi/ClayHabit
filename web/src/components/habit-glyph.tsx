import { memo, useEffect, useState } from 'react';

import { getHabitIcon } from '@/features/habits/icons/lookup';
import { habitPalette, type HabitColor } from '@/theme/habit-palette';

type IconTable = Record<string, string>;

// The icon set is ~200 KB of markup, so it loads on first use rather than with the page.
let table: IconTable | null = null;
let loading: Promise<IconTable> | null = null;

function loadIcons(): Promise<IconTable> {
  loading ??= import('@/features/habits/icons/icon-svgs.generated').then((module) => (table = module.ICON_SVGS));
  return loading;
}

function useIconTable(): IconTable | null {
  const [icons, setIcons] = useState(table);
  useEffect(() => {
    if (!icons) void loadIcons().then(setIcons);
  }, [icons]);
  return icons;
}

/**
 * A bundled habit icon (Tabler line icons, Fluent emoji), from the same
 * generated markup the phone draws. It's the app's own trusted set, never user
 * input. Line icons take `currentColor`. The box has its size before the
 * markup arrives, so nothing moves when it does.
 */
export const HabitIconSvg = memo(function HabitIconSvg({ id, size, color }: { id: string; size: number; color?: string }) {
  const icons = useIconTable();
  const markup = icons?.[id];
  return (
    <span className="habit-icon" style={{ width: size, height: size, color }} aria-hidden dangerouslySetInnerHTML={markup ? { __html: markup } : undefined} />
  );
});

interface HabitGlyphProps {
  icon: string | null;
  emoji: string;
  color: HabitColor;
  size?: number;
  /** For glyphs sitting on a coloured hero: a frosted tile instead of a tinted one. */
  onGradient?: boolean;
}

/**
 * The phone's HabitGlyph (src/features/habits/habit-glyph.tsx): line icons in
 * white on the habit's gradient, colour icons on a soft tint, and the plain
 * emoji only when the habit has no icon (or one this build doesn't know).
 */
export function HabitGlyph({ icon, emoji, color, size = 42, onGradient = false }: HabitGlyphProps) {
  const swatch = habitPalette[color] ?? habitPalette.purple;
  const def = getHabitIcon(icon);
  const tile = { width: size, height: size, borderRadius: Math.round(size * 0.32), flex: 'none' as const };

  if (def?.kind === 'line' && !onGradient) {
    return (
      <span className="habit-glyph" style={{ ...tile, background: `linear-gradient(135deg, ${swatch.gradient[0]}, ${swatch.gradient[1]})` }} aria-hidden>
        <HabitIconSvg id={def.id} size={Math.round(size * 0.52)} color="#FFFFFF" />
      </span>
    );
  }

  const background = onGradient ? 'rgba(255,255,255,0.25)' : `${swatch.base}1F`;
  return (
    <span className="habit-glyph" style={{ ...tile, background }} aria-hidden>
      {def ? (
        <HabitIconSvg id={def.id} size={Math.round(size * (def.kind === 'line' ? 0.52 : 0.62))} color={onGradient ? '#FFFFFF' : swatch.base} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.52), lineHeight: 1 }}>{emoji}</span>
      )}
    </span>
  );
}
