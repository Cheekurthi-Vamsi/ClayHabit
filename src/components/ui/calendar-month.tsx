import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import * as Haptics from '@/lib/haptics';
import { useSettingsStore } from '@/store/settings-store';
import { fontFamily, useAppTheme } from '@/theme';
import { toLocalIsoDate, todayIso } from '@/utils/date';

import { Icon } from './icon';
import { Text } from './text';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CELL = 38;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface CalendarMonthProps {
  year: number;
  month: number;
  onChangeMonth: (year: number, month: number) => void;
  /** Local `YYYY-MM-DD`. */
  selected: string | null;
  onSelect: (isoDate: string) => void;
  /** Days that get a small dot (e.g. something scheduled). */
  markedDates?: ReadonlySet<string>;
  minDate?: string;
  maxDate?: string;
  /** The sun / moon switch from the design. */
  showThemeToggle?: boolean;
}

/**
 * The month from the Apple-style calendar (the user's apple-calendar-picker):
 * a "September 2026 ⌄" title that opens a month/year chooser, chevrons,
 * SUN–SAT headers and round day cells, in ClayHabbit's colours.
 */
export function CalendarMonth({
  year,
  month,
  onChangeMonth,
  selected,
  onSelect,
  markedDates,
  minDate,
  maxDate,
  showThemeToggle = false,
}: CalendarMonthProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const [chooser, setChooser] = useState(false);
  const [chooserYear, setChooserYear] = useState(year);
  const today = todayIso();
  const accent = theme.colors.primary;

  const step = (delta: number) => {
    Haptics.selectionAsync();
    const date = new Date(year, month + delta, 1);
    onChangeMonth(date.getFullYear(), date.getMonth());
  };

  const leading = new Date(year, month, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth(year, month) }, (_, index) => toLocalIsoDate(new Date(year, month, index + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const chevron = (name: 'chevron-left' | 'chevron-right', label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.round, pressed && { backgroundColor: theme.colors.surfacePressed }]}
    >
      <Icon name={name} size={18} color={accent} />
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            setChooserYear(year);
            setChooser((open) => !open);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${MONTH_NAMES[month]} ${year}. Choose month and year`}
          accessibilityState={{ expanded: chooser }}
          hitSlop={6}
          style={styles.title}
        >
          <Text style={[styles.titleText, { color: accent }]}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <View style={{ transform: [{ rotate: chooser ? '180deg' : '0deg' }] }}>
            <Icon name="chevron-down" size={16} color={accent} />
          </View>
        </Pressable>
        <View style={styles.nav}>
          {showThemeToggle ? (
            <Pressable
              onPress={() => setThemePreference(theme.scheme === 'dark' ? 'light' : 'dark')}
              accessibilityRole="button"
              accessibilityLabel={theme.scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              hitSlop={8}
              style={({ pressed }) => [styles.round, styles.themeGap, pressed && { backgroundColor: theme.colors.surfacePressed }]}
            >
              <Icon name={theme.scheme === 'dark' ? 'sun' : 'moon'} size={16} color={accent} />
            </Pressable>
          ) : null}
          {chevron('chevron-left', 'Previous month', () => step(-1))}
          {chevron('chevron-right', 'Next month', () => step(1))}
        </View>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={[styles.weekday, { color: theme.colors.textTertiary }]}>
            {day}
          </Text>
        ))}
      </View>

      <View>
        <View style={styles.grid}>
          {cells.map((iso, index) => {
            if (!iso) return <View key={`blank-${index}`} style={styles.cell} />;
            const isSelected = iso === selected;
            const isToday = iso === today;
            const disabled = (minDate !== undefined && iso < minDate) || (maxDate !== undefined && iso > maxDate);
            const marked = markedDates?.has(iso) ?? false;
            const label = new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });
            return (
              <View key={iso} style={styles.cell}>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelect(iso);
                  }}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}${isToday ? ', today' : ''}${marked ? ', has plans' : ''}`}
                  accessibilityState={{ selected: isSelected, disabled }}
                  style={[
                    styles.day,
                    isSelected && [styles.daySelected, { backgroundColor: theme.colors.highlight }],
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? theme.colors.onHighlight
                          : disabled
                            ? theme.colors.textTertiary
                            : theme.colors.textPrimary,
                        opacity: disabled ? 0.45 : 1,
                        fontFamily: isSelected || isToday ? fontFamily.bold : fontFamily.medium,
                      },
                    ]}
                  >
                    {Number(iso.slice(8, 10))}
                  </Text>
                </Pressable>
                <View style={[styles.dot, { backgroundColor: marked ? accent : 'transparent' }]} />
              </View>
            );
          })}
        </View>

        {chooser ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(150)}
            exiting={reduceMotion ? undefined : FadeOut.duration(120)}
            style={[styles.chooser, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <View style={[styles.chooserHeader, { borderBottomColor: theme.colors.border }]}>
              {chevron('chevron-left', 'Previous year', () => setChooserYear((value) => value - 1))}
              <Text variant="titleMedium">{chooserYear}</Text>
              {chevron('chevron-right', 'Next year', () => setChooserYear((value) => value + 1))}
            </View>
            <View style={styles.months}>
              {MONTH_NAMES.map((name, index) => {
                const active = index === month && chooserYear === year;
                return (
                  <Pressable
                    key={name}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onChangeMonth(chooserYear, index);
                      setChooser(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${name} ${chooserYear}`}
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.monthCell,
                      active && { backgroundColor: theme.colors.highlight },
                      !active && pressed && { backgroundColor: theme.colors.surfacePressed },
                    ]}
                  >
                    <Text
                      variant="labelLarge"
                      style={{ color: active ? theme.colors.onHighlight : theme.colors.textPrimary }}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleText: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  round: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeGap: {
    marginRight: 6,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 2,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 2,
  },
  day: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    transform: [{ scale: 1.05 }],
  },
  dayText: {
    fontSize: 15,
    lineHeight: 20,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  chooser: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  chooserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
  months: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'space-around',
  },
  monthCell: {
    width: '33.33%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
});
