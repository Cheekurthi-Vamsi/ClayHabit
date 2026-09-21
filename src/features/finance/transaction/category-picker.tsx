import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';

import { Text } from '@/components/ui';
import type { FinCategory } from '@/domain/finance/entities';
import { habitPalette, useAppTheme } from '@/theme';

interface CategoryPickerProps {
  categories: readonly FinCategory[];
  selectedId: string | null;
  /** Tapping the selected category again clears it — a category is optional. */
  onSelect: (id: string | null) => void;
}

/**
 * Two rows of category chips in one horizontal scroll, filled column by
 * column so the first (most common) categories are all visible without scrolling.
 */
export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  const theme = useAppTheme();
  const rows = [categories.filter((_, index) => index % 2 === 0), categories.filter((_, index) => index % 2 === 1)];

  const chip = (category: FinCategory) => {
    const selected = category.id === selectedId;
    const swatch = habitPalette[category.color];
    return (
      <Pressable
        key={category.id}
        onPress={() => {
          Haptics.selectionAsync();
          onSelect(selected ? null : category.id);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={category.name}
        style={({ pressed }) => [
          styles.chip,
          {
            borderRadius: theme.radii.md,
            backgroundColor: selected ? `${swatch.base}1F` : theme.colors.surfaceMuted,
            borderColor: selected ? swatch.base : 'transparent',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <RNText style={styles.emoji}>{category.emoji}</RNText>
        <Text variant="labelLarge" color={selected ? 'textPrimary' : 'textSecondary'}>
          {category.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scroll}
      accessibilityRole="radiogroup"
    >
      <View style={styles.rows}>
        {rows.map((row, index) => (
          <View key={index} style={styles.row}>
            {row.map(chip)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingRight: 20,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
  },
});
