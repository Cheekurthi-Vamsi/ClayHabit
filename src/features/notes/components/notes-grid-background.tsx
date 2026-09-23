import { memo } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Mask, Pattern, Rect, Stop } from 'react-native-svg';

import type { NotePaper } from '@/domain/entities/note';
import { useAppTheme } from '@/theme';
import { paperInk } from '@/theme/note-palette';

/** Grid spacing, nudged by pixel density so lines land on whole pixels. */
function spacingFor(base: number): number {
  const ratio = PixelRatio.get();
  return Math.round(base * ratio) / ratio;
}

interface NotesGridBackgroundProps {
  paper?: NotePaper;
  /** Base cell size in points. */
  cell?: number;
  /** Fades the pattern out toward the top and bottom edges. */
  fade?: boolean;
  /** Draw inside a parent's bounds instead of the whole window. */
  width?: number;
  height?: number;
  color?: string;
}

/**
 * The writing-paper texture behind Notes: very faint grid, ruled lines or
 * dots. It sits behind content, never takes touches, and fades at the
 * edges so it reads as atmosphere, not noise.
 */
export const NotesGridBackground = memo(function NotesGridBackground({
  paper = 'grid',
  cell = 24,
  fade = true,
  width,
  height,
  color,
}: NotesGridBackgroundProps) {
  const theme = useAppTheme();
  const window = useWindowDimensions();
  if (paper === 'plain') return null;

  const w = width ?? window.width;
  const h = height ?? window.height;
  const size = spacingFor(cell);
  const ink = color ?? paperInk[theme.scheme === 'dark' ? 'dark' : 'light'];
  const stroke = 1 / PixelRatio.get() + 0.35;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Svg width={w} height={h}>
        <Defs>
          <Pattern id="notes-paper" width={size} height={size} patternUnits="userSpaceOnUse">
            {paper === 'grid' ? (
              <>
                <Line x1={0} y1={0} x2={size} y2={0} stroke={ink} strokeWidth={stroke} />
                <Line x1={0} y1={0} x2={0} y2={size} stroke={ink} strokeWidth={stroke} />
              </>
            ) : paper === 'lines' ? (
              <Line x1={0} y1={size - stroke} x2={size} y2={size - stroke} stroke={ink} strokeWidth={stroke} />
            ) : (
              <Circle cx={size / 2} cy={size / 2} r={1.1} fill={ink} />
            )}
          </Pattern>
          {fade ? (
            <>
              <LinearGradient id="notes-paper-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.12" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="0.85" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
              <Mask id="notes-paper-mask">
                <Rect width={w} height={h} fill="url(#notes-paper-fade)" />
              </Mask>
            </>
          ) : null}
        </Defs>
        <Rect width={w} height={h} fill="url(#notes-paper)" mask={fade ? 'url(#notes-paper-mask)' : undefined} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
