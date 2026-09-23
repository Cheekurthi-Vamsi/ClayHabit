import { useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';

import { Chip, Icon, SegmentedControl, Text } from '@/components/ui';
import { habitPalette, useAppTheme, type HabitColor } from '@/theme';

import { ICON_CATEGORIES, type HabitIconCategory, type HabitIconDef, type HabitIconKind } from './icons/catalog';
import { IconSvg } from './icons/icon-svg';
import { getHabitIcon, iconsInCategory, searchHabitIcons } from './icons/lookup';

const GAP = 8;
const MIN_CELL = 44;

const KIND_OPTIONS = [
  { value: 'line', label: 'Icons' },
  { value: 'emoji', label: 'Emoji' },
] as const;

interface IconPickerProps {
  icon: string | null;
  emoji: string;
  color: HabitColor;
  /** `icon` is null when the person typed their own emoji. */
  onChange: (icon: string | null, emoji: string) => void;
}

function IconCell({
  def,
  selected,
  color,
  size,
  onPress,
}: {
  def: HabitIconDef;
  selected: boolean;
  color: HabitColor;
  size: number;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const swatch = habitPalette[color];
  const glyph = Math.round(size * (def.kind === 'line' ? 0.46 : 0.58));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={def.label}
      style={({ pressed }) => [{ width: size, height: size, opacity: pressed ? 0.7 : 1 }]}
    >
      {selected && def.kind === 'line' ? (
        <LinearGradient
          colors={swatch.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cell, { borderRadius: theme.radii.md }]}
        >
          <IconSvg id={def.id} size={glyph} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.cell,
            styles.cellBorder,
            {
              borderRadius: theme.radii.md,
              backgroundColor: selected ? `${swatch.base}1F` : theme.colors.surfaceMuted,
              borderColor: selected ? swatch.base : 'transparent',
            },
          ]}
        >
          <IconSvg id={def.id} size={glyph} color={theme.colors.textSecondary} />
        </View>
      )}
    </Pressable>
  );
}

export function IconPicker({ icon, emoji, color, onChange }: IconPickerProps) {
  const theme = useAppTheme();
  const current = getHabitIcon(icon);
  const [kind, setKind] = useState<HabitIconKind>(current?.kind ?? (icon === null ? 'emoji' : 'line'));
  const [category, setCategory] = useState<HabitIconCategory>(current?.category ?? 'health');
  const [query, setQuery] = useState('');
  const [gridWidth, setGridWidth] = useState(0);
  const [customText, setCustomText] = useState(icon === null ? emoji : '');

  const searching = query.trim().length > 0;
  const results = searching ? searchHabitIcons(kind, query) : iconsInCategory(kind, category);

  // Fill the row exactly: as many ≥44pt cells as fit, stretched to the edges.
  const columns = Math.max(5, Math.floor((gridWidth + GAP) / (MIN_CELL + GAP)));
  const cellSize = gridWidth > 0 ? (gridWidth - GAP * (columns - 1)) / columns : MIN_CELL;

  const pick = (def: HabitIconDef) => {
    Haptics.selectionAsync();
    onChange(def.id, def.emoji);
  };

  const onGridLayout = (event: LayoutChangeEvent) => setGridWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <SegmentedControl
        options={KIND_OPTIONS}
        value={kind}
        onChange={(next) => setKind(next)}
        accessibilityLabel="Icon style"
      />

      <View style={[styles.search, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
        <Icon name="search" size={16} color={theme.colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={kind === 'line' ? 'Search icons: run, water, read…' : 'Search emoji: fire, sleep, book…'}
          placeholderTextColor={theme.colors.textTertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search icons"
          style={[styles.searchInput, theme.typography.bodyMedium, { color: theme.colors.textPrimary }]}
        />
        {searching ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Icon name="x-circle" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {!searching ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
          keyboardShouldPersistTaps="handled"
        >
          {ICON_CATEGORIES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={item.key === category}
              onPress={() => setCategory(item.key)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View onLayout={onGridLayout} style={styles.grid} accessibilityRole="radiogroup">
        {gridWidth > 0
          ? results.map((def) => (
              <IconCell
                key={def.id}
                def={def}
                selected={def.id === icon}
                color={color}
                size={cellSize}
                onPress={() => pick(def)}
              />
            ))
          : null}
      </View>

      {searching && results.length === 0 ? (
        <Text variant="bodySmall" color="textSecondary" style={styles.empty}>
          No {kind === 'line' ? 'icons' : 'emoji'} match “{query.trim()}”.
          {kind === 'line' ? ' Try the Emoji tab.' : ' Type your own below.'}
        </Text>
      ) : null}

      {kind === 'emoji' ? (
        <View style={styles.customRow}>
          <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
            Or use any emoji from your keyboard
          </Text>
          <TextInput
            value={customText}
            onChangeText={(text) => {
              setCustomText(text);
              const trimmed = text.trim();
              if (trimmed) onChange(null, trimmed);
            }}
            placeholder="🙂"
            maxLength={8}
            selectTextOnFocus
            accessibilityLabel="Custom emoji"
            style={[
              styles.customInput,
              {
                borderRadius: theme.radii.md,
                backgroundColor: icon === null ? `${habitPalette[color].base}1F` : theme.colors.surfaceMuted,
                borderColor: icon === null ? habitPalette[color].base : 'transparent',
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
  },
  categories: {
    gap: 8,
    paddingRight: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    minHeight: MIN_CELL,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBorder: {
    borderWidth: 1.5,
  },
  empty: {
    textAlign: 'center',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInput: {
    width: 56,
    height: 44,
    borderWidth: 1.5,
    fontSize: 22,
    textAlign: 'center',
    padding: 0,
  },
});
