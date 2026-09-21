import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BarChart, Button, Skeleton, Text } from '@/components/ui';
import { weekdayIndex } from '@/domain/services/habit-engine';
import { formatShortDate } from '@/domain/services/heatmap';
import { useAppTheme } from '@/theme';
import { addDaysIso, todayIso } from '@/utils/date';

import { ChartCard } from './chart-card';
import { useFocusByDay } from './hooks';
import { average, dailySeries, formatMinutes, indexOfMax } from './insights';

const DAYS = 14;
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Minutes of focus per day for two weeks, with the daily average marked. */
export function FocusTrendCard() {
  const theme = useAppTheme();
  const router = useRouter();
  const today = todayIso();
  const { data, isLoading } = useFocusByDay(addDaysIso(today, -(DAYS - 1)), today);

  const { dates, values } = dailySeries(data ?? {}, today, DAYS);
  const total = values.reduce((sum, value) => sum + value, 0);
  const best = indexOfMax(values);

  return (
    <ChartCard title="Focus time" subtitle="Minutes per day · last 2 weeks">
      {isLoading ? (
        <Skeleton height={130} radius={theme.radii.md} />
      ) : total === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodySmall" color="textSecondary" style={styles.emptyText}>
            No focus sessions in the last two weeks. A 25-minute session is a great start.
          </Text>
          <Button
            label="Start focusing"
            icon="play"
            size="sm"
            variant="outline"
            onPress={() => router.push({ pathname: '/focus', params: { autostart: '25' } })}
          />
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.metric}>
              <Text variant="headlineMedium">{formatMinutes(total)}</Text>
              <Text variant="caption" color="textSecondary">
                total
              </Text>
            </View>
            <View style={styles.metric}>
              <Text variant="headlineMedium">{formatMinutes(average(values))}</Text>
              <Text variant="caption" color="textSecondary">
                daily average
              </Text>
            </View>
          </View>
          <BarChart
            values={values}
            labels={dates.map((date) => LETTERS[weekdayIndex(date)])}
            gradient={theme.gradients.secondary}
            highlightIndex={best}
            formatValue={formatMinutes}
            showAverage
            accessibilityLabel={`${formatMinutes(total)} of focus over the last 14 days: ${dates
              .map((date, index) => (values[index] > 0 ? `${formatShortDate(date)} ${formatMinutes(values[index])}` : null))
              .filter(Boolean)
              .join(', ')}`}
          />
        </>
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    gap: 24,
  },
  metric: {
    gap: 2,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
});
