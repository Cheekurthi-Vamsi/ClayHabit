import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AreaChart, SegmentedControl, Skeleton, Text } from '@/components/ui';
import type { ActivityBreakdown } from '@/data/repositories/activity-repository';
import { weekdayIndex } from '@/domain/services/habit-engine';
import { formatShortDate } from '@/domain/services/heatmap';
import { useAppTheme } from '@/theme';
import { addDaysIso, todayIso } from '@/utils/date';

import { ChartCard, DeltaPill } from './chart-card';
import { dailySeries, percentChange, sumRange, WEEKDAY_NAMES } from './insights';

type Range = '7' | '30' | '90';

const RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
] as const;

function dayLabel(iso: string): string {
  return `${WEEKDAY_NAMES[weekdayIndex(iso)].slice(0, 3)}, ${formatShortDate(iso)}`;
}

/** Everything done per day (tasks + habit check-ins) as a trend, against the period before. */
export function MomentumCard({ activity, loading }: { activity: ActivityBreakdown | undefined; loading: boolean }) {
  const theme = useAppTheme();
  const [range, setRange] = useState<Range>('30');
  const [selected, setSelected] = useState<number | null>(null);

  const days = Number(range);
  const today = todayIso();
  const totals = activity?.total ?? {};
  const { dates, values } = dailySeries(totals, today, days);
  const total = values.reduce((sum, value) => sum + value, 0);
  const previous = sumRange(totals, addDaysIso(today, -(days * 2 - 1)), addDaysIso(today, -days));
  const perDay = total / days;
  const mid = Math.floor((days - 1) / 2);

  const selectedDate = selected !== null ? dates[selected] : null;

  return (
    <ChartCard
      title="Momentum"
      subtitle="Tasks and habit check-ins per day"
      accessory={
        <View style={styles.switcher}>
          <SegmentedControl
            options={RANGES}
            value={range}
            size="sm"
            accessibilityLabel="Time range"
            onChange={(next) => {
              setRange(next);
              setSelected(null);
            }}
          />
        </View>
      }
    >
      {loading ? (
        <Skeleton height={190} radius={theme.radii.md} />
      ) : (
        <>
          <View style={styles.summary}>
            {selectedDate ? (
              <>
                <Text style={[styles.bigNumber, { color: theme.colors.textPrimary }]}>{values[selected!]}</Text>
                <View style={styles.summaryText}>
                  <Text variant="labelLarge">{dayLabel(selectedDate)}</Text>
                  <Text variant="caption" color="textSecondary">
                    {activity?.tasks[selectedDate] ?? 0} tasks · {activity?.habits[selectedDate] ?? 0} check-ins
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.bigNumber, { color: theme.colors.textPrimary }]}>{total}</Text>
                <View style={styles.summaryText}>
                  <View style={styles.inline}>
                    <Text variant="labelLarge">done in {days} days</Text>
                    <DeltaPill value={percentChange(total, previous)} />
                  </View>
                  <Text variant="caption" color="textSecondary">
                    {perDay.toFixed(1)} a day · {previous} the {days} days before
                  </Text>
                </View>
              </>
            )}
          </View>

          <AreaChart
            values={values}
            gradient={theme.gradients.aurora}
            selectedIndex={selected}
            onSelectIndex={setSelected}
            xLabels={[
              { index: 0, label: formatShortDate(dates[0]) },
              { index: mid, label: formatShortDate(dates[mid]) },
              { index: days - 1, label: 'Today' },
            ]}
            accessibilityLabel={`${total} things done in the last ${days} days, about ${perDay.toFixed(1)} a day`}
          />
        </>
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  switcher: {
    width: 150,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bigNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
  },
});
