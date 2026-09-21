import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CashFlowBars } from '@/components/finance/cash-flow-bars';
import { MoneyText } from '@/components/finance/money-text';
import { AreaChart, Card, Text } from '@/components/ui';
import { formatMoney, maskedMoney } from '@/domain/finance/currency';
import { formatDayLabel, formatMonthLabel } from '@/domain/finance/month';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import type { FinanceOverview } from '../overview';

/**
 * Money in vs out this month, then the balance line through the month. Drag
 * across the line to read any day: its balance, and what came in and went out.
 */
export function CashFlowCard({ overview }: { overview: FinanceOverview }) {
  const theme = useAppTheme();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const [selected, setSelected] = useState<number | null>(null);
  const { dates, balances, flows, summary, account, monthKey, available } = overview;
  const currency = account.currency;

  // A new day (or month) changes the series; drop a selection that no longer points anywhere.
  const index = selected !== null && selected < dates.length ? selected : null;
  const date = index !== null ? dates[index] : null;
  const flow = date ? flows[date] : undefined;
  const month = formatMonthLabel(monthKey).split(' ')[0];

  return (
    <Card style={styles.card}>
      <View style={styles.titles}>
        <Text variant="titleMedium" accessibilityRole="header">
          Cash flow
        </Text>
        <Text variant="caption" color="textTertiary">
          {month} so far
        </Text>
      </View>

      <CashFlowBars incomeMinor={summary.income} expenseMinor={summary.expense} currency={currency} />

      {dates.length >= 2 ? (
        <View style={[styles.trend, { borderTopColor: theme.colors.border }]}>
          <View style={styles.readout}>
            <View style={styles.readoutText}>
              <Text variant="caption" color="textSecondary">
                {date ? `Balance on ${formatDayLabel(date)}` : 'Balance today'}
              </Text>
              <MoneyText
                variant="headlineMedium"
                amountMinor={index !== null ? balances[index] : available}
                currency={currency}
              />
            </View>
            {date ? (
              <View style={styles.dayFlows}>
                <MoneyText
                  variant="labelMedium"
                  color="financeText"
                  amountMinor={flow?.income ?? 0}
                  currency={currency}
                  sign="always"
                />
                <MoneyText
                  variant="labelMedium"
                  color="textSecondary"
                  amountMinor={-(flow?.expense ?? 0)}
                  currency={currency}
                />
              </View>
            ) : (
              <Text variant="caption" color="textTertiary" style={styles.hint}>
                Drag across the line to see any day
              </Text>
            )}
          </View>

          <AreaChart
            values={balances}
            gradient={theme.gradients.finance}
            height={130}
            selectedIndex={index}
            onSelectIndex={setSelected}
            formatScale={(value) => (hidden ? maskedMoney(currency) : formatMoney(value, currency, { compact: true }))}
            xLabels={[
              { index: 0, label: formatDayLabel(dates[0]) },
              { index: dates.length - 1, label: 'Today' },
            ]}
            accessibilityLabel={
              hidden
                ? `Balance through ${month}, amounts hidden`
                : `Balance through ${month}: started at ${formatMoney(summary.startBalance, currency)}, now ${formatMoney(available, currency)}`
            }
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  titles: {
    gap: 2,
  },
  trend: {
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  readoutText: {
    gap: 2,
    flexShrink: 1,
  },
  dayFlows: {
    alignItems: 'flex-end',
    gap: 2,
  },
  hint: {
    textAlign: 'right',
    flexShrink: 1,
  },
});
