import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { AreaChart, Card, LineChart, Text } from '@/components/ui';
import { formatMoney, maskedMoney } from '@/domain/finance/currency';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import type { FinanceStats, SpendingPace } from '../stats';

/** Remembers a pick only for the data it was made on, so a new period starts fresh without an effect. */
function usePick(signature: string) {
  const [picked, setPicked] = useState<{ index: number; signature: string } | null>(null);
  return [picked?.signature === signature ? picked.index : null, (index: number) => setPicked({ index, signature })] as const;
}

function useScaleFormatter(currency: string) {
  const hidden = useSettingsStore((state) => state.hideAmounts);
  return (value: number) => (hidden ? maskedMoney(currency) : formatMoney(value, currency, { compact: true }));
}

/** The spendable balance across the period: day by day for a month, month-end otherwise. */
export function BalanceTrendCard({ stats }: { stats: FinanceStats }) {
  const theme = useAppTheme();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const { balances, currency, period } = stats;
  const [picked, pick] = usePick(`${JSON.stringify(period)}:${balances.length}`);
  const formatScale = useScaleFormatter(currency);
  if (balances.length < 2) return null;

  const index = picked ?? balances.length - 1;
  const point = balances[index];
  const first = balances[0];
  const last = balances[balances.length - 1];
  const change = last.value - first.value;

  return (
    <Card style={styles.card}>
      <View style={styles.titles}>
        <Text variant="titleMedium" accessibilityRole="header">
          Balance over time
        </Text>
        <Text variant="caption" color="textTertiary">
          {period.scope === 'month' ? 'At the end of each day' : 'At the end of each month'}
        </Text>
      </View>

      <View style={styles.readout}>
        <View style={styles.flex}>
          <Text variant="caption" color="textSecondary">
            {point.label}
          </Text>
          <MoneyText variant="headlineMedium" amountMinor={point.value} currency={currency} />
        </View>
        <View style={styles.end}>
          <Text variant="caption" color="textSecondary">
            Change
          </Text>
          <MoneyText variant="labelLarge" amountMinor={change} currency={currency} sign="always" />
        </View>
      </View>

      <AreaChart
        values={balances.map((item) => item.value)}
        gradient={theme.gradients.finance}
        height={140}
        selectedIndex={picked}
        onSelectIndex={pick}
        formatScale={formatScale}
        xLabels={[
          { index: 0, label: first.label.replace('End of ', '').replace(' so far', '') },
          { index: balances.length - 1, label: stats.range.inProgress ? 'Now' : last.label.replace('End of ', '') },
        ]}
        accessibilityLabel={
          hidden
            ? 'Balance over time, amounts hidden'
            : `Balance over time: ${formatMoney(first.value, currency)} at ${first.label}, ${formatMoney(last.value, currency)} at ${last.label}`
        }
      />
      <Text variant="caption" color="textTertiary">
        Drag across the line to read any point.
      </Text>
    </Card>
  );
}

function LineKey({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.keyRow}>
      <View style={[styles.lineKey, { backgroundColor: color }]} />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

/**
 * Spending added up through this period, against the whole of the last one.
 * This period is the accent; the last one is context in grey.
 */
export function SpendingPaceCard({ pace, stats }: { pace: SpendingPace; stats: FinanceStats }) {
  const theme = useAppTheme();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const { currency, period } = stats;
  const length = pace.pointLabels.length;
  const [picked, pick] = usePick(`${JSON.stringify(period)}:${length}`);
  const formatScale = useScaleFormatter(currency);

  const lastCurrent = pace.current.length - 1;
  const index = picked ?? Math.max(0, lastCurrent);
  const current = index <= lastCurrent ? pace.current[index] : null;
  const previous = pace.previous[Math.min(index, pace.previous.length - 1)] ?? 0;
  const unit = period.scope === 'month' ? 'day' : 'month';
  const where = picked === null ? 'So far' : `By ${pace.pointLabels[index]?.replace('Day', 'day')}`;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text variant="titleMedium" accessibilityRole="header">
            Spending pace
          </Text>
          <Text variant="caption" color="textTertiary">
            Spending added up, {unit} by {unit}
          </Text>
        </View>
        <View style={styles.legend}>
          <LineKey color={theme.colors.chartExpense} label={pace.currentLabel} />
          <LineKey color={theme.colors.textTertiary} label={pace.previousLabel} />
        </View>
      </View>

      <View style={styles.readout}>
        <View style={styles.flex}>
          <Text variant="caption" color="textSecondary">
            {where}, {pace.currentLabel}
          </Text>
          {current !== null ? (
            <MoneyText variant="headlineMedium" amountMinor={current} currency={currency} />
          ) : (
            <Text variant="headlineMedium" color="textTertiary">
              —
            </Text>
          )}
        </View>
        <View style={styles.end}>
          <Text variant="caption" color="textSecondary">
            {pace.previousLabel}
          </Text>
          <MoneyText variant="labelLarge" amountMinor={previous} currency={currency} />
        </View>
      </View>

      <LineChart
        series={[
          { values: pace.previous, color: theme.colors.textTertiary },
          { values: pace.current, color: theme.colors.chartExpense },
        ]}
        length={length}
        selectedIndex={picked}
        onSelectIndex={pick}
        formatScale={formatScale}
        xLabels={[
          { index: 0, label: pace.pointLabels[0] },
          { index: length - 1, label: pace.pointLabels[length - 1] },
        ]}
        accessibilityLabel={
          hidden
            ? `Spending pace, ${pace.currentLabel} against ${pace.previousLabel}, amounts hidden`
            : `Spending pace: ${formatMoney(pace.current[lastCurrent] ?? 0, currency)} so far in ${pace.currentLabel}; ${pace.previousLabel} reached ${formatMoney(pace.previous[pace.previous.length - 1] ?? 0, currency)} in total`
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  flex: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  legend: {
    gap: 4,
    alignItems: 'flex-end',
    paddingTop: 3,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineKey: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  end: {
    alignItems: 'flex-end',
  },
});
