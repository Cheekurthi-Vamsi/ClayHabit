import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { getMonthGridDates, todayIso } from '@/utils/date';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface MonthGridProps {
  year: number;
  month: number;
  selectedDate: string;
  markedDates: Set<string>;
  onSelectDate: (date: string) => void;
  onChangeMonth: (delta: number) => void;
}

export function MonthGrid({
  year,
  month,
  selectedDate,
  markedDates,
  onSelectDate,
  onChangeMonth,
}: MonthGridProps) {
  const theme = useAppTheme();
  const today = todayIso();
  const dates = useMemo(() => getMonthGridDates(year, month), [year, month]);
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.header}>
        <Pressable onPress={() => onChangeMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8}>
          <Icon name="chevron-left" size={20} color={theme.colors.textSecondary} />
        </Pressable>
        <Text variant="titleMedium">{monthLabel}</Text>
        <Pressable onPress={() => onChangeMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8}>
          <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={index} variant="caption" color="textTertiary" style={styles.weekdayCell}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {dates.map((date) => {
          const inMonth = new Date(`${date}T00:00:00`).getMonth() === month;
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const hasMarker = markedDates.has(date);

          return (
            <Pressable
              key={date}
              onPress={() => onSelectDate(date)}
              accessibilityRole="button"
              accessibilityLabel={date}
              style={styles.dayCell}
            >
              <View
                style={[
                  styles.dayCircle,
                  { borderRadius: theme.radii.full },
                  isSelected ? { backgroundColor: theme.colors.primary } : null,
                  !isSelected && isToday ? { borderWidth: 1.5, borderColor: theme.colors.primary } : null,
                ]}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: isSelected
                      ? theme.colors.onPrimary
                      : inMonth
                        ? theme.colors.textPrimary
                        : theme.colors.textTertiary,
                  }}
                >
                  {Number(date.slice(8, 10))}
                </Text>
              </View>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: hasMarker ? theme.colors.secondary : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
