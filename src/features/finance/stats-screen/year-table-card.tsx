import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { Card, Icon, Text } from '@/components/ui';
import type { YearSummary } from '@/domain/finance/analytics';
import { useAppTheme } from '@/theme';

import { formatRate } from './summary-card';

const NUMBERS = { fontVariant: ['tabular-nums' as const] };

/**
 * Every year side by side — the table behind the all-time chart. Tap a year
 * to open it.
 */
export function YearTableCard({
  years,
  currency,
  currentYear,
  onOpenYear,
}: {
  years: YearSummary[];
  currency: string;
  currentYear: number;
  onOpenYear: (year: number) => void;
}) {
  const theme = useAppTheme();
  if (years.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.titles}>
        <Text variant="titleMedium" accessibilityRole="header">
          Year by year
        </Text>
        <Text variant="caption" color="textTertiary">
          Tap a year to see it in detail
        </Text>
      </View>

      <View>
        <View style={[styles.row, styles.head]}>
          <Text variant="caption" color="textTertiary" style={styles.year}>
            Year
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.amount}>
            In
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.amount}>
            Out
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.amount}>
            Net
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.rate}>
            Rate
          </Text>
          <View style={styles.chevron} />
        </View>
        {years.map((year, index) => (
          <Fragment key={year.year}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
            <Pressable
              onPress={() => onOpenYear(year.year)}
              accessibilityRole="button"
              accessibilityHint={`Opens ${year.year}`}
              style={({ pressed }) => [styles.row, styles.body, pressed && { backgroundColor: theme.colors.surfacePressed }]}
            >
              <View style={styles.year}>
                <Text variant="labelLarge" style={NUMBERS}>
                  {year.year}
                </Text>
                {year.year === currentYear ? (
                  <Text variant="caption" color="textTertiary">
                    so far
                  </Text>
                ) : null}
              </View>
              <MoneyText variant="labelMedium" style={[styles.amount, NUMBERS]} amountMinor={year.income} currency={currency} compact />
              <MoneyText variant="labelMedium" style={[styles.amount, NUMBERS]} amountMinor={year.expense} currency={currency} compact />
              <MoneyText
                variant="labelMedium"
                style={[styles.amount, NUMBERS]}
                amountMinor={year.net}
                currency={currency}
                sign="always"
                compact
              />
              <Text variant="labelMedium" color="textSecondary" style={[styles.rate, NUMBERS]}>
                {formatRate(year.savingsRate)}
              </Text>
              <View style={styles.chevron}>
                <Icon name="chevron-right" size={14} color={theme.colors.textTertiary} />
              </View>
            </Pressable>
          </Fragment>
        ))}
      </View>
      <Text variant="caption" color="textTertiary">
        Rate is the share of income kept (not spent or transferred out).
      </Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  head: {
    paddingBottom: 6,
  },
  body: {
    minHeight: 48,
    paddingVertical: 6,
    borderRadius: 8,
  },
  year: {
    width: 48,
  },
  amount: {
    flex: 1,
    textAlign: 'right',
  },
  rate: {
    width: 44,
    textAlign: 'right',
  },
  chevron: {
    width: 14,
    alignItems: 'flex-end',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
