import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, ProgressBar, Text, type IconName } from '@/components/ui';
import type { BudgetLine, BudgetState } from '@/domain/finance/budget';
import { useAppTheme, type ThemeColors } from '@/theme';

import { CategoryGlyph } from './category-glyph';
import { MoneyText } from './money-text';

/**
 * Budget states always pair an icon with a label (dataviz status rule), and
 * the words stay factual: "Near limit", not "Warning!".
 */
export const BUDGET_STATUS: Record<BudgetState, { label: string; icon: IconName; tone: keyof ThemeColors }> = {
  healthy: { label: 'On track', icon: 'check-circle', tone: 'finance' },
  warning: { label: 'Most used', icon: 'info', tone: 'warning' },
  'near-limit': { label: 'Near limit', icon: 'alert-circle', tone: 'warning' },
  exceeded: { label: 'Over budget', icon: 'alert-triangle', tone: 'error' },
};

interface BudgetMeterProps {
  line: BudgetLine;
  currency: string;
  onPress?: () => void;
}

/** One budget: name, spent of limit, a meter whose fill carries the state, and what's left. */
export function BudgetMeter({ line, currency, onPress }: BudgetMeterProps) {
  const theme = useAppTheme();
  const { usage } = line;
  const status = BUDGET_STATUS[usage.state];
  const tone = theme.colors[status.tone];
  const percent = Number.isFinite(usage.ratio) ? Math.round(usage.ratio * 100) : 100;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Edit this budget' : undefined}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <CategoryGlyph emoji={line.emoji} color={line.color} size={36} />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text variant="labelLarge" numberOfLines={1} style={styles.flex}>
            {line.name}
          </Text>
          <View style={styles.amounts}>
            <MoneyText variant="labelLarge" amountMinor={usage.spentMinor} currency={currency} />
            <Text variant="caption" color="textTertiary">
              {' of '}
            </Text>
            <MoneyText variant="caption" color="textTertiary" amountMinor={usage.limitMinor} currency={currency} />
          </View>
        </View>
        <ProgressBar progress={Math.min(1, usage.ratio)} color={tone} height={8} />
        <View style={styles.line}>
          <View style={styles.status}>
            <Icon name={status.icon} size={13} color={tone} />
            <Text variant="caption" color="textSecondary">
              {status.label}
              {' · '}
            </Text>
            <MoneyText
              variant="caption"
              color="textSecondary"
              amountMinor={Math.abs(usage.remainingMinor)}
              currency={currency}
            />
            <Text variant="caption" color="textSecondary">
              {usage.remainingMinor >= 0 ? ' left' : ' over'}
            </Text>
          </View>
          <Text variant="caption" color="textTertiary">
            {percent}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
    gap: 6,
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
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
