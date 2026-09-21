import { StyleSheet, View } from 'react-native';

import { ProgressBar, RadialBarChart, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { ChartCard } from './chart-card';
import { dayParts, formatHour, hourBuckets, peakHour } from './insights';

const TICKS = [
  [0, '12a'],
  [6, '6a'],
  [12, '12p'],
  [18, '6p'],
] as const;

/** A 24-hour dial of when tasks get finished, plus the split across the day. */
export function PeakHoursCard({ hours }: { hours: readonly number[] }) {
  const theme = useAppTheme();
  const buckets = hourBuckets(hours);
  const peak = peakHour(hours);
  const parts = dayParts(hours);
  const total = hours.length;
  const biggest = Math.max(1, ...parts.map((part) => part.count));

  return (
    <ChartCard title="Peak hours" subtitle="When you finish tasks · last 60 days">
      <View style={styles.row}>
        <RadialBarChart
          values={buckets}
          size={156}
          color={theme.colors.primary}
          highlightColor={theme.colors.accentPink}
          highlightIndex={peak}
          ticks={TICKS}
          accessibilityLabel={
            peak === null
              ? 'No completed tasks in the last 60 days'
              : `Most tasks are finished around ${formatHour(peak)}`
          }
        >
          <Text variant="titleMedium">{total}</Text>
          <Text variant="caption" color="textTertiary">
            tasks
          </Text>
        </RadialBarChart>

        <View style={styles.side}>
          <View>
            <Text variant="caption" color="textSecondary">
              PEAK HOUR
            </Text>
            <Text variant="headlineMedium">{peak === null ? '—' : formatHour(peak)}</Text>
          </View>
          {parts.map((part) => (
            <View key={part.key} style={styles.part}>
              <View style={styles.partLabel}>
                <Text variant="labelMedium">{part.label}</Text>
                <Text variant="caption" color="textSecondary">
                  {total > 0 ? `${Math.round((part.count / total) * 100)}%` : '0%'}
                </Text>
              </View>
              <ProgressBar
                progress={part.count / biggest}
                gradient={theme.gradients.primary}
                height={5}
              />
            </View>
          ))}
        </View>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  side: {
    flex: 1,
    gap: 8,
  },
  part: {
    gap: 4,
  },
  partLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
