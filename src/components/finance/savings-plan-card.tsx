import { StyleSheet, View } from 'react-native';

import { Card, Icon, ProgressBar, Text } from '@/components/ui';
import { PRIORITY_LABELS, type SavingsPlanWithProgress } from '@/domain/finance/entities';
import { formatMoney } from '@/domain/finance/currency';
import { formatMonthLabel, monthKeyOf } from '@/domain/finance/month';
import { projectSavings } from '@/domain/finance/savings';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { CategoryGlyph } from './category-glyph';
import { MoneyText } from './money-text';

interface SavingsPlanCardProps {
  plan: SavingsPlanWithProgress;
  currency: string;
  onPress?: () => void;
}

/** A plan at a glance: how far along, by when, and what it takes per month. */
export function SavingsPlanCard({ plan, currency, onPress }: SavingsPlanCardProps) {
  const theme = useAppTheme();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const projection = projectSavings({
    targetMinor: plan.targetMinor,
    savedMinor: plan.savedMinor,
    targetDate: plan.targetDate,
    today: todayIso(),
  });
  const percent = Math.round(projection.progress * 100);

  const details = [
    `${percent}%`,
    plan.targetDate ? `by ${formatMonthLabel(monthKeyOf(plan.targetDate))}` : null,
    !projection.isComplete && projection.requiredMonthlyMinor && !hidden
      ? `≈${formatMoney(projection.requiredMonthlyMinor, currency, { compact: true })}/month`
      : null,
  ].filter(Boolean);

  return (
    <Card onPress={onPress} accessibilityLabel={`${plan.name}, ${percent} percent saved`} style={styles.card}>
      <View style={styles.row}>
        <CategoryGlyph emoji={plan.emoji} color={plan.color} size={44} />
        <View style={styles.titles}>
          <View style={styles.line}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.flex}>
              {plan.name}
            </Text>
            {projection.isComplete ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.financeMuted }]}>
                <Icon name="check" size={12} color={theme.colors.financeText} />
                <Text variant="caption" color="financeText">
                  Reached
                </Text>
              </View>
            ) : plan.priority === 1 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text variant="caption" color="textSecondary">
                  {PRIORITY_LABELS[1]} priority
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.amounts}>
            <MoneyText variant="labelLarge" amountMinor={plan.savedMinor} currency={currency} />
            <Text variant="caption" color="textTertiary">
              {' of '}
            </Text>
            <MoneyText variant="caption" color="textTertiary" amountMinor={plan.targetMinor} currency={currency} />
          </View>
        </View>
      </View>
      <ProgressBar progress={projection.progress} gradient={theme.gradients.finance} height={8} />
      <Text variant="caption" color="textSecondary">
        {details.join(' · ')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
