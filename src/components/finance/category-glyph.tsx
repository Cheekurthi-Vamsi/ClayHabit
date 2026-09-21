import { StyleSheet, Text, View } from 'react-native';

import { habitPalette, type HabitColor } from '@/theme';

interface CategoryGlyphProps {
  emoji: string;
  color: HabitColor;
  size?: number;
}

/** A category's emoji on a soft tint of its colour. */
export function CategoryGlyph({ emoji, color, size = 40 }: CategoryGlyphProps) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          backgroundColor: `${habitPalette[color].base}1F`,
        },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.66) }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
