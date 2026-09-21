import { StyleSheet, View } from 'react-native';

import { Card, Heatmap, HeatmapLegend, Text } from '@/components/ui';
import type { HabitWithLogs } from '@/domain/entities/habit';
import {
  computeHabitStats,
  describeSchedule,
  habitLevel,
  isScheduledOn,
  nextTapCount,
} from '@/domain/services/habit-engine';
import { buildCalendarColumns } from '@/domain/services/heatmap';
import { habitPalette } from '@/theme';
import { todayIso } from '@/utils/date';

import { HabitCheckButton } from './habit-check-button';
import { HabitGlyph } from './habit-glyph';
import { useSetHabitCount } from './hooks';

interface HabitCardProps {
  habit: HabitWithLogs;
  /** `full`: a year, scrollable, with labels and legend. `compact`: ~4 months that fit the card. */
  variant?: 'full' | 'compact';
  onPress?: () => void;
}

export function HabitCard({ habit, variant = 'full', onPress }: HabitCardProps) {
  const setCount = useSetHabitCount();

  const today = todayIso();
  const count = habit.logs[today] ?? 0;
  const target = habit.targetPerDay;
  const swatch = habitPalette[habit.color];
  const stats = computeHabitStats(habit.logs, target, habit.daysOfWeek, today);
  const scheduledToday = isScheduledOn(habit.daysOfWeek, today);

  const full = variant === 'full';
  const columns = buildCalendarColumns(full ? 53 : 17, today);
  const rangeStart = columns[0][0].date;
  const checkInsInRange = Object.entries(habit.logs).reduce(
    (sum, [date, value]) => (date >= rangeStart && date <= today ? sum + value : sum),
    0,
  );

  const subtitleParts = [
    stats.currentStreak > 0 ? `🔥 ${stats.currentStreak} day streak` : describeSchedule(habit.daysOfWeek),
    target > 1 ? `${count}/${target} today` : null,
    !scheduledToday ? 'Rest day' : null,
  ].filter(Boolean);

  return (
    <Card onPress={onPress} accessibilityLabel={`${habit.name}, ${subtitleParts.join(', ')}`} style={styles.card}>
      <View style={styles.header}>
        <HabitGlyph icon={habit.icon} emoji={habit.emoji} color={habit.color} size={42} />
        <View style={styles.titles}>
          <Text variant="titleMedium" numberOfLines={1}>
            {habit.name}
          </Text>
          <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {subtitleParts.join(' · ')}
          </Text>
        </View>
        <HabitCheckButton
          habit={habit}
          count={count}
          onPress={() => setCount.mutate({ habitId: habit.id, date: today, count: nextTapCount(count, target) })}
          onLongPress={
            count > 0
              ? () => setCount.mutate({ habitId: habit.id, date: today, count: count - 1 })
              : undefined
          }
        />
      </View>

      {full ? (
        <View style={styles.summaryRow}>
          <Text variant="bodySmall">
            <Text variant="labelLarge">{checkInsInRange}</Text>
            <Text variant="bodySmall" color="textSecondary">
              {' '}
              check-ins in the past year
            </Text>
          </Text>
          <Text variant="caption" color="textTertiary">
            Max streak {stats.bestStreak}
          </Text>
        </View>
      ) : null}

      <Heatmap
        columns={columns}
        levelFor={(date) => habitLevel(habit.logs[date] ?? 0, target)}
        color={swatch.base}
        cellSize={full ? 12 : 11}
        gap={3}
        showMonthLabels={full}
        showWeekdayLabels={full}
        scrollable={full}
        accessibilityLabel={`${habit.name} history: ${checkInsInRange} check-ins, current streak ${stats.currentStreak} days`}
      />

      {full ? (
        <View style={styles.footer}>
          <Text variant="caption" color="textTertiary">
            {stats.activeDays} active days
          </Text>
          <HeatmapLegend color={swatch.base} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
