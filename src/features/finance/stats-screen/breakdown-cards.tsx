import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CategoryGlyph } from '@/components/finance/category-glyph';
import { MoneyText } from '@/components/finance/money-text';
import { SpendingBreakdown } from '@/components/finance/spending-breakdown';
import { Card, GroupedBarChart, Icon, ProgressBar, Text } from '@/components/ui';
import { formatMoney } from '@/domain/finance/currency';
import type { CategoryBreakdown } from '@/domain/finance/ledger';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import type { FinanceStats } from '../stats';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titles}>
      <Text variant="titleMedium" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="textTertiary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Categories ranked by size, for spending or for income. */
export function BreakdownCard({
  title,
  subtitle,
  breakdown,
  currency,
}: {
  title: string;
  subtitle: string;
  breakdown: CategoryBreakdown;
  currency: string;
}) {
  if (breakdown.items.length === 0) return null;
  return (
    <Card style={styles.card}>
      <CardTitle title={title} subtitle={subtitle} />
      <SpendingBreakdown breakdown={breakdown} currency={currency} />
    </Card>
  );
}

/** This period's biggest categories against the period before. */
export function CategoryChangesCard({ stats }: { stats: FinanceStats }) {
  const theme = useAppTheme();
  const { changes, comparison, currency } = stats;
  if (changes.length === 0 || !comparison) return null;

  return (
    <Card style={styles.card}>
      <CardTitle title="What changed" subtitle={`Compared with ${comparison.label}`} />
      {changes.map((change, index) => {
        const up = change.delta !== null && change.delta > 0;
        return (
          <Fragment key={change.categoryId ?? 'none'}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
            <View style={styles.change}>
              <CategoryGlyph emoji={change.emoji} color={change.color} size={34} />
              <View style={styles.flex}>
                <Text variant="labelLarge">{change.name}</Text>
                <View style={styles.inline}>
                  <MoneyText variant="caption" color="textSecondary" amountMinor={change.currentMinor} currency={currency} />
                  <Text variant="caption" color="textTertiary">
                    {' '}
                    from{' '}
                  </Text>
                  <MoneyText variant="caption" color="textTertiary" amountMinor={change.previousMinor} currency={currency} />
                </View>
              </View>
              <View style={styles.delta}>
                {change.delta === null ? (
                  <Text variant="labelMedium" color="textTertiary">
                    New
                  </Text>
                ) : Math.abs(change.delta) < 1 ? (
                  <Text variant="labelMedium" color="textTertiary">
                    Same
                  </Text>
                ) : (
                  <>
                    <Icon name={up ? 'arrow-up' : 'arrow-down'} size={12} color={theme.colors.textSecondary} />
                    <Text variant="labelMedium" color="textSecondary">
                      {Math.abs(Math.round(change.delta))}%
                    </Text>
                  </>
                )}
              </View>
            </View>
          </Fragment>
        );
      })}
    </Card>
  );
}

/** When in the week the money goes, and what it's paid with. */
export function SpendingPatternsCard({ stats }: { stats: FinanceStats }) {
  const theme = useAppTheme();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const { weekdays, payments, currency, period } = stats;
  const signature = `${JSON.stringify(period)}:${weekdays.join(',')}`;
  const [picked, setPicked] = useState<{ index: number; signature: string } | null>(null);
  const hasWeekdays = weekdays.some((value) => value > 0);
  if (!hasWeekdays && payments.length === 0) return null;

  const busiest = weekdays.reduce((best, value, index) => (value > weekdays[best] ? index : best), 0);
  const index = picked?.signature === signature ? picked.index : busiest;

  return (
    <Card style={styles.card}>
      {hasWeekdays ? (
        <>
          <CardTitle title="Spending by weekday" subtitle="Average spent on each day of the week" />
          <View style={styles.readout}>
            <Text variant="labelLarge">
              {WEEKDAYS[index]}
              {index === busiest ? ' · your biggest day' : ''}
            </Text>
            <MoneyText variant="labelLarge" color="textSecondary" amountMinor={weekdays[index]} currency={currency} />
          </View>
          <GroupedBarChart
            groups={weekdays.map((value, day) => ({ label: WEEKDAYS[day].slice(0, 3), values: [value] }))}
            colors={[theme.colors.chartExpense]}
            height={110}
            selectedIndex={index}
            onSelectIndex={(next) => setPicked({ index: next, signature })}
            accessibilityLabel={
              hidden
                ? 'Average spending per weekday, amounts hidden'
                : `Average spending per weekday: ${weekdays
                    .map((value, day) => `${WEEKDAYS[day]} ${formatMoney(value, currency)}`)
                    .join(', ')}`
            }
          />
        </>
      ) : null}

      {hasWeekdays && payments.length > 0 ? (
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      ) : null}

      {payments.length > 0 ? (
        <>
          <CardTitle title="How you pay" subtitle="Spending by payment method" />
          <View style={styles.list}>
            {payments.map((payment) => (
              <View key={payment.method ?? 'none'} style={styles.payment}>
                <View style={styles.line}>
                  <Text variant="labelLarge" numberOfLines={1} style={styles.flex}>
                    {payment.label}
                  </Text>
                  <MoneyText variant="labelLarge" amountMinor={payment.totalMinor} currency={currency} />
                </View>
                <ProgressBar progress={payment.share} color={theme.colors.finance} height={6} />
                <View style={styles.line}>
                  <Text variant="caption" color="textTertiary">
                    {payment.count} {payment.count === 1 ? 'payment' : 'payments'}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {payment.share > 0 && payment.share < 0.01 ? '<1%' : `${Math.round(payment.share * 100)}%`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  titles: {
    gap: 2,
  },
  flex: {
    flex: 1,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  list: {
    gap: 14,
  },
  payment: {
    gap: 5,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
