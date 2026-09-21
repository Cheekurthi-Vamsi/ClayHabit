import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { habitPalette, type HabitColor } from '@/theme';

import { IconSvg } from './icons/icon-svg';
import { getHabitIcon } from './icons/lookup';

interface HabitGlyphProps {
  icon: string | null;
  emoji: string;
  color: HabitColor;
  /** Tile edge length. */
  size?: number;
  /** For glyphs sitting on a coloured hero: a frosted tile instead of a tinted one. */
  onGradient?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A habit's icon tile. Line icons are drawn in white on the habit's gradient,
 * colour emoji on a soft tint, and anything unknown falls back to the plain
 * emoji text the habit always carries.
 */
export function HabitGlyph({ icon, emoji, color, size = 42, onGradient = false, style }: HabitGlyphProps) {
  const swatch = habitPalette[color];
  const def = getHabitIcon(icon);
  const tile: ViewStyle = { width: size, height: size, borderRadius: Math.round(size * 0.32) };

  if (def?.kind === 'line' && !onGradient) {
    return (
      <LinearGradient
        colors={swatch.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.center, tile, style]}
      >
        <IconSvg id={def.id} size={Math.round(size * 0.52)} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  const background = onGradient ? 'rgba(255,255,255,0.25)' : `${swatch.base}1F`;

  return (
    <View style={[styles.center, tile, { backgroundColor: background }, style]}>
      {def ? (
        <IconSvg
          id={def.id}
          size={Math.round(size * (def.kind === 'line' ? 0.52 : 0.62))}
          color="#FFFFFF"
        />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.52), lineHeight: Math.round(size * 0.68) }}>{emoji}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
