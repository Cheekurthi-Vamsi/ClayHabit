import { StyleSheet, View } from 'react-native';

import { ProgressBar, Text } from '@/components/ui';
import type { CategoryBreakdown } from '@/domain/finance/ledger';
import { useAppTheme } from '@/theme';

import { CategoryGlyph } from './category-glyph';
import { MoneyText } from './money-text';

interface SpendingBreakdownProps {
  breakdown: CategoryBreakdown;
  currency: string;
}

function percent(share: number): string {
  const value = share * 100;
  return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`;
}

/**
 * Where the money went, largest first. Categories are nominal, so every bar is
 * the same finance hue — the emoji and name carry identity, the bar only
 * carries size — and a long tail folds into "Other".
 */
export function SpendingBreakdown({ breakdown, currency }: SpendingBreakdownProps) {
  const theme = useAppTheme();
  const rows = [
    ...breakdown.items.map((item) => ({
      key: item.categoryId ?? 'none',
      name: item.name,
      emoji: item.emoji,
      color: item.color,
      totalMinor: item.totalMinor,
      share: item.share,
      detail: `${item.count} ${item.count === 1 ? 'payment' : 'payments'}`,
    })),
    ...(breakdown.other
      ? [
          {
            key: 'other',
            name: 'Everything else',
            emoji: '•••',
            color: 'purple' as const,
            totalMinor: breakdown.other.totalMinor,
            share: breakdown.other.share,
            detail: `${breakdown.other.categories} categories`,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <CategoryGlyph emoji={row.emoji} color={row.color} size={34} />
          <View style={styles.body}>
            <View style={styles.line}>
              <Text variant="labelLarge" numberOfLines={1} style={styles.flex}>
                {row.name}
              </Text>
              <MoneyText variant="labelLarge" amountMinor={row.totalMinor} currency={currency} />
            </View>
            <ProgressBar progress={row.share} color={theme.colors.finance} height={6} />
            <View style={styles.line}>
              <Text variant="caption" color="textTertiary">
                {row.detail}
              </Text>
              <Text variant="caption" color="textSecondary">
                {percent(row.share)}
              </Text>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
    gap: 5,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
