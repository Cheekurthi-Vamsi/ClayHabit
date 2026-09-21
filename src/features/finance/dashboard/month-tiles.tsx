import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { Card, Icon, Text, type IconName } from '@/components/ui';
import type { MonthSummary } from '@/domain/finance/ledger';
import { percentDelta } from '@/domain/finance/ledger';
import { useAppTheme, type GradientStops } from '@/theme';

function Tile({
  icon,
  gradient,
  label,
  amountMinor,
  currency,
  countUpKey,
  caption,
}: {
  icon: IconName;
  gradient: GradientStops;
  label: string;
  amountMinor: number;
  currency: string;
  countUpKey: string;
  caption: string;
}) {
  return (
    <Card style={styles.tile}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
        <Icon name={icon} size={16} color="#FFFFFF" />
      </LinearGradient>
      <Text variant="labelMedium" color="textSecondary">
        {label}
      </Text>
      <MoneyText
        variant="headlineLarge"
        amountMinor={amountMinor}
        currency={currency}
        countUpKey={countUpKey}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      />
      <Text variant="caption" color="textTertiary" numberOfLines={2}>
        {caption}
      </Text>
    </Card>
  );
}

interface MonthTilesProps {
  summary: MonthSummary;
  spentSamePointLastMonth: number;
  currency: string;
}

/** Saved and spent this month, side by side. */
export function MonthTiles({ summary, spentSamePointLastMonth, currency }: MonthTilesProps) {
  const theme = useAppTheme();
  const rate = summary.savingsRate;
  const change = percentDelta(summary.expense, spentSamePointLastMonth);

  const savedCaption =
    rate === null
      ? 'Add income to see how much you keep'
      : rate >= 0
        ? `${Math.round(rate * 100)}% of this month's income`
        : 'Spending is ahead of income this month';

  // Plain facts, no verdicts: more or less than the same point last month.
  const spentCaption =
    change === null
      ? 'Nothing to compare with last month yet'
      : Math.abs(change) < 1
        ? 'About the same as this time last month'
        : `${Math.abs(Math.round(change))}% ${change > 0 ? 'more' : 'less'} than this time last month`;

  return (
    <View style={styles.row}>
      <Tile
        icon="shield"
        gradient={theme.gradients.mintCyan}
        label="SAVED"
        amountMinor={summary.kept}
        currency={currency}
        countUpKey="finance.kept"
        caption={savedCaption}
      />
      <Tile
        icon="shopping-bag"
        gradient={theme.gradients.secondary}
        label="SPENT"
        amountMinor={summary.expense}
        currency={currency}
        countUpKey="finance.spent"
        caption={spentCaption}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    gap: 6,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
