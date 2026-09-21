import { StyleSheet, View } from 'react-native';

import { DonutChart, Skeleton, Text } from '@/components/ui';
import type { TaskPriority } from '@/domain/entities/task';
import { useAppTheme } from '@/theme';
import { addDaysIso, todayIso } from '@/utils/date';

import { PRIORITY_COLOR, PRIORITY_LABEL } from '../tasks/task-list-item';
import { ChartCard } from './chart-card';
import { usePriorityBreakdown } from './hooks';

const ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

/** What kind of work got done: completed tasks by priority over 30 days. */
export function PriorityMixCard() {
  const theme = useAppTheme();
  const { data, isLoading } = usePriorityBreakdown(addDaysIso(todayIso(), -29));

  const counts = data ?? { urgent: 0, high: 0, medium: 0, low: 0 };
  const total = ORDER.reduce((sum, priority) => sum + counts[priority], 0);
  const segments = ORDER.map((priority) => ({
    key: priority,
    value: counts[priority],
    color: theme.colors[PRIORITY_COLOR[priority]],
  }));

  return (
    <ChartCard title="Priority mix" subtitle="Completed tasks · last 30 days">
      {isLoading ? (
        <Skeleton height={132} radius={theme.radii.md} />
      ) : (
        <View style={styles.row}>
          <DonutChart
            segments={segments}
            accessibilityLabel={
              total === 0
                ? 'No tasks completed in the last 30 days'
                : `${total} tasks: ${ORDER.map((p) => `${counts[p]} ${PRIORITY_LABEL[p]}`).join(', ')}`
            }
          >
            <Text variant="headlineMedium">{total}</Text>
            <Text variant="caption" color="textTertiary">
              tasks
            </Text>
          </DonutChart>

          <View style={styles.legend}>
            {ORDER.map((priority) => (
              <View key={priority} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: theme.colors[PRIORITY_COLOR[priority]] }]} />
                <Text variant="labelLarge" style={styles.flex}>
                  {PRIORITY_LABEL[priority]}
                </Text>
                <Text variant="labelLarge">{counts[priority]}</Text>
                <Text variant="caption" color="textTertiary" style={styles.percent}>
                  {total > 0 ? `${Math.round((counts[priority] / total) * 100)}%` : '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  flex: {
    flex: 1,
  },
  percent: {
    width: 34,
    textAlign: 'right',
  },
});
