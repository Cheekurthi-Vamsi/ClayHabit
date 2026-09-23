import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { Card, Heatmap, HeatmapLegend, Text } from '@/components/ui';
import { rankLevels } from '@/domain/finance/analytics';
import { formatDayLabel } from '@/domain/finance/month';
import { yearEnd } from '@/domain/finance/period';
import { buildRangeColumns } from '@/domain/services/heatmap';
import { useAppTheme } from '@/theme';

import type { FinanceStats } from '../stats';

/**
 * A year of spending, one square per day, GitHub-style. Darker days ranked
 * higher among the days you spent anything; empty days stay blank.
 */
export function SpendingCalendarCard({ stats, dailySpend }: { stats: FinanceStats; dailySpend: Record<string, number> }) {
  const theme = useAppTheme();
  const { range, today, currency, period } = stats;
  const year = period.scope === 'year' ? period.year : Number(range.from.slice(0, 4));
  const [picked, setPicked] = useState<{ date: string; year: number } | null>(null);
  const selectedDate = picked?.year === year ? picked.date : null;

  const columns = useMemo(() => buildRangeColumns(range.from, yearEnd(year), today), [range.from, year, today]);
  const levelOf = useMemo(() => rankLevels(Object.values(dailySpend)), [dailySpend]);
  const spendDays = stats.dayCount - stats.noSpendDays;

  return (
    <Card style={styles.card}>
      <View style={styles.titles}>
        <Text variant="titleMedium" accessibilityRole="header">
          Spending calendar
        </Text>
        <Text variant="caption" color="textTertiary">
          Every day of {year}. Tap a day to see what you spent.
        </Text>
      </View>

      <View style={styles.readout}>
        {selectedDate ? (
          <>
            <Text variant="labelLarge">{formatDayLabel(selectedDate)}</Text>
            {dailySpend[selectedDate] ? (
              <MoneyText variant="labelLarge" color="textSecondary" amountMinor={dailySpend[selectedDate]} currency={currency} />
            ) : (
              <Text variant="labelLarge" color="textSecondary">
                Nothing spent
              </Text>
            )}
          </>
        ) : (
          <Text variant="labelLarge" color="textSecondary">
            Spent on {spendDays} of {stats.dayCount} days
          </Text>
        )}
      </View>

      <Heatmap
        columns={columns}
        levelFor={(date) => levelOf(dailySpend[date] ?? 0)}
        color={theme.colors.chartExpense}
        showMonthLabels
        showWeekdayLabels
        scrollable
        selectedDate={selectedDate}
        onSelectDate={(date) => setPicked({ date, year })}
        accessibilityLabel={`Spending calendar for ${year}: spent on ${spendDays} of ${stats.dayCount} days`}
      />
      <HeatmapLegend color={theme.colors.chartExpense} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  titles: {
    gap: 2,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
  },
});
