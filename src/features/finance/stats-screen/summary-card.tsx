import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { Card, Icon, Text } from '@/components/ui';
import { percentDelta } from '@/domain/finance/ledger';
import { periodLabel } from '@/domain/finance/period';
import { useAppTheme } from '@/theme';

import type { FinanceStats } from '../stats';

export function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  const percent = Math.round(rate * 100);
  return percent < 0 ? `−${Math.abs(percent)}%` : `${percent}%`;
}

function Delta({ label, current, previous }: { label: string; current: number; previous: number }) {
  const theme = useAppTheme();
  const delta = percentDelta(current, previous);
  if (delta === null) return null;
  const same = Math.abs(delta) < 1;
  return (
    <View style={styles.delta}>
      {same ? null : <Icon name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={12} color={theme.colors.textSecondary} />}
      <Text variant="labelMedium" color="textSecondary">
        {label} {same ? 'about the same' : `${delta > 0 ? 'up' : 'down'} ${Math.abs(Math.round(delta))}%`}
      </Text>
    </View>
  );
}

/** The period's headline: what was kept, what came in and went out, and how that compares. */
export function SummaryCard({ stats }: { stats: FinanceStats }) {
  const { summary, comparison, currency, period, range } = stats;
  const title =
    period.scope === 'all' ? 'Net, all time' : `Net, ${periodLabel(period)}${range.inProgress ? ' so far' : ''}`;

  return (
    <Card style={styles.card}>
      <View style={styles.hero}>
        <Text variant="labelMedium" color="textSecondary">
          {title.toUpperCase()}
        </Text>
        <MoneyText variant="displayMedium" amountMinor={summary.net} currency={currency} sign="always" />
      </View>

      <View style={styles.row}>
        <View style={styles.cell}>
          <Text variant="caption" color="textSecondary">
            Money in
          </Text>
          <MoneyText variant="titleMedium" amountMinor={summary.income} currency={currency} />
        </View>
        <View style={styles.cell}>
          <Text variant="caption" color="textSecondary">
            Money out
          </Text>
          <MoneyText variant="titleMedium" amountMinor={summary.expense} currency={currency} />
        </View>
        <View style={styles.cell}>
          <Text variant="caption" color="textSecondary">
            Savings rate
          </Text>
          <Text variant="titleMedium">{formatRate(summary.savingsRate)}</Text>
        </View>
      </View>

      {comparison && (comparison.summary.expense > 0 || comparison.summary.income > 0) ? (
        <View style={styles.comparison}>
          <Delta label="Spending" current={summary.expense} previous={comparison.summary.expense} />
          <Delta label="Income" current={summary.income} previous={comparison.summary.income} />
          <Text variant="caption" color="textTertiary">
            Compared with {comparison.label}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  hero: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    gap: 2,
  },
  comparison: {
    gap: 4,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
