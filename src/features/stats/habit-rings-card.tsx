import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityRings, Text } from '@/components/ui';
import type { HabitWithLogs } from '@/domain/entities/habit';
import { isScheduledOn } from '@/domain/services/habit-engine';
import { habitPalette, useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { HabitGlyph } from '../habits/habit-glyph';
import { ChartCard } from './chart-card';

const MAX_RINGS = 4;

/** Today's progress on up to four habits as concentric rings. */
export function HabitRingsCard({ habits }: { habits: readonly HabitWithLogs[] }) {
  const theme = useAppTheme();
  const router = useRouter();
  const today = todayIso();

  const scheduled = habits.filter((habit) => isScheduledOn(habit.daysOfWeek, today));
  const shown = (scheduled.length > 0 ? scheduled : habits).slice(0, MAX_RINGS);
  const done = shown.filter((habit) => (habit.logs[today] ?? 0) >= habit.targetPerDay).length;

  if (shown.length === 0) return null;

  return (
    <ChartCard
      title="Today's rings"
      subtitle={done === shown.length ? 'Every ring closed today' : `${done} of ${shown.length} closed`}
    >
      <View style={styles.row}>
        <ActivityRings
          rings={shown.map((habit) => ({
            key: habit.id,
            progress: (habit.logs[today] ?? 0) / habit.targetPerDay,
            gradient: habitPalette[habit.color].gradient,
            color: habitPalette[habit.color].base,
          }))}
          size={136}
          thickness={12}
          accessibilityLabel={`${done} of ${shown.length} habit rings closed today`}
        />

        <View style={styles.legend}>
          {shown.map((habit) => {
            const count = habit.logs[today] ?? 0;
            return (
              <Pressable
                key={habit.id}
                onPress={() => router.push(`/habit/${habit.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${habit.name}: ${count} of ${habit.targetPerDay} today`}
                style={({ pressed }) => [styles.legendRow, pressed && { opacity: 0.6 }]}
              >
                <HabitGlyph icon={habit.icon} emoji={habit.emoji} color={habit.color} size={28} />
                <Text variant="labelLarge" numberOfLines={1} style={styles.flex}>
                  {habit.name}
                </Text>
                <Text variant="labelMedium" color="textSecondary">
                  {Math.min(count, habit.targetPerDay)}/{habit.targetPerDay}
                </Text>
              </Pressable>
            );
          })}
          {habits.length > shown.length ? (
            <Text variant="caption" color="textTertiary">
              +{habits.length - shown.length} more below
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.hint, { borderTopColor: theme.colors.border }]}>
        <Text variant="caption" color="textTertiary">
          Rings fill as you check in. Tap a habit to open it.
        </Text>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  hint: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
});
