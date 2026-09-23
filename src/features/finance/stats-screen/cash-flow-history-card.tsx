import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { Card, DivergingBarChart, GroupedBarChart, Text } from '@/components/ui';
import { formatMoney } from '@/domain/finance/currency';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import type { FinanceStats } from '../stats';

function Key({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.keyRow}>
      <View style={[styles.key, { backgroundColor: color }]} />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

/**
 * Money in and out per month (or per year, all time), then what each one
 * kept or overspent on a zero line. Both charts share one pick, and the
 * readout above them names its numbers.
 */
export function CashFlowHistoryCard({ stats }: { stats: FinanceStats }) {
  const theme = useAppTheme();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const { flows, currency, flowUnit, period } = stats;
  // Remember which data the pick belongs to, so switching period drops it without an effect.
  const signature = flows.map((flow) => flow.key).join(',');
  const [picked, setPicked] = useState<{ index: number; signature: string } | null>(null);

  const latest = flows.reduce((last, flow, index) => (flow.isFuture ? last : index), 0);
  const index = picked?.signature === signature ? picked.index : latest;
  const flow = flows[index];
  const select = (next: number) => setPicked({ index: next, signature });
  const isFuture = (i: number) => flows[i]?.isFuture ?? false;
  const unit = flowUnit === 'year' ? 'year' : 'month';

  const subtitle =
    period.scope === 'month'
      ? 'The six months up to this one'
      : period.scope === 'year'
        ? 'Month by month'
        : 'Every year since you started';

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text variant="titleMedium" accessibilityRole="header">
            Cash flow
          </Text>
          <Text variant="caption" color="textTertiary">
            {subtitle}
          </Text>
        </View>
        <View style={styles.legend}>
          <Key color={theme.colors.chartIncome} label="In" />
          <Key color={theme.colors.chartExpense} label="Out" />
        </View>
      </View>

      {flow ? (
        <View style={styles.readout}>
          <Text variant="labelLarge">{flow.title}</Text>
          <View style={styles.readoutRow}>
            <View style={styles.readoutCell}>
              <Text variant="caption" color="textSecondary">
                Money in
              </Text>
              <MoneyText variant="titleMedium" amountMinor={flow.income} currency={currency} />
            </View>
            <View style={styles.readoutCell}>
              <Text variant="caption" color="textSecondary">
                Money out
              </Text>
              <MoneyText variant="titleMedium" amountMinor={flow.expense} currency={currency} />
            </View>
            <View style={styles.readoutCell}>
              <Text variant="caption" color="textSecondary">
                Difference
              </Text>
              <MoneyText variant="titleMedium" amountMinor={flow.net} currency={currency} sign="always" />
            </View>
          </View>
        </View>
      ) : null}

      <GroupedBarChart
        groups={flows.map((item) => ({ label: item.label, values: [item.income, item.expense] }))}
        colors={[theme.colors.chartIncome, theme.colors.chartExpense]}
        selectedIndex={index}
        onSelectIndex={select}
        isInactive={isFuture}
        accessibilityLabel={
          hidden
            ? `Money in and out per ${unit}, amounts hidden`
            : `Money in and out per ${unit}: ${flows
                .filter((item) => !item.isFuture)
                .map(
                  (item) =>
                    `${item.title} in ${formatMoney(item.income, currency)}, out ${formatMoney(item.expense, currency)}`,
                )
                .join('; ')}`
        }
      />

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text variant="titleMedium" accessibilityRole="header">
            Kept or overspent
          </Text>
          <Text variant="caption" color="textTertiary">
            Money in minus money out, each {unit}
          </Text>
        </View>
        <View style={styles.legend}>
          <Key color={theme.colors.chartIncome} label="Kept" />
          <Key color={theme.colors.chartExpense} label="Over" />
        </View>
      </View>

      <DivergingBarChart
        values={flows.map((item) => item.net)}
        labels={flows.map((item) => item.label)}
        positiveColor={theme.colors.chartIncome}
        negativeColor={theme.colors.chartExpense}
        selectedIndex={index}
        onSelectIndex={select}
        isInactive={isFuture}
        accessibilityLabel={
          hidden
            ? `Money kept or overspent per ${unit}, amounts hidden`
            : `Money kept or overspent per ${unit}: ${flows
                .filter((item) => !item.isFuture)
                .map((item) => `${item.title} ${formatMoney(item.net, currency, { sign: 'always' })}`)
                .join('; ')}`
        }
      />
      <Text variant="caption" color="textTertiary">
        Tap a {unit} to see its numbers.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 3,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  key: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  readout: {
    gap: 6,
  },
  readoutRow: {
    flexDirection: 'row',
    gap: 10,
  },
  readoutCell: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
