import { StyleSheet, View } from 'react-native';

import { ProgressBar, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { MoneyText } from './money-text';

interface CashFlowBarsProps {
  incomeMinor: number;
  expenseMinor: number;
  currency: string;
}

/**
 * Money in vs money out on one shared scale. Each bar is labelled with its
 * name and amount, which is also what lets the lighter income hue pass
 * contrast (the dataviz relief rule: visible labels).
 */
export function CashFlowBars({ incomeMinor, expenseMinor, currency }: CashFlowBarsProps) {
  const theme = useAppTheme();
  const scale = Math.max(incomeMinor, expenseMinor, 1);
  const rows = [
    { key: 'in', label: 'Money in', value: incomeMinor, color: theme.colors.chartIncome },
    { key: 'out', label: 'Money out', value: expenseMinor, color: theme.colors.chartExpense },
  ];

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={styles.line}>
            <View style={styles.label}>
              <View style={[styles.key, { backgroundColor: row.color }]} />
              <Text variant="labelLarge" color="textSecondary">
                {row.label}
              </Text>
            </View>
            <MoneyText variant="titleMedium" amountMinor={row.value} currency={currency} />
          </View>
          <ProgressBar progress={row.value / scale} color={row.color} height={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  row: {
    gap: 6,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  key: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
});
