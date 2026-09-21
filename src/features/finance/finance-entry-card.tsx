import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { useSwitchEnvironment } from '@/components/navigation/environment-switcher';
import { GradientCard, Icon, Text } from '@/components/ui';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { useFinanceOverview } from './hooks';

/**
 * The door into Finance from the productivity Home. It shows no figures unless
 * the person turns on "Show summary on Home" — and privacy mode still masks them.
 */
export function FinanceEntryCard() {
  const theme = useAppTheme();
  const switchTo = useSwitchEnvironment();
  const showSummary = useSettingsStore((state) => state.showFinanceSummary);
  const { data: overview } = useFinanceOverview({ enabled: showSummary });
  const withFigures = showSummary && overview && !overview.isEmpty;

  return (
    <GradientCard
      gradient={theme.gradients.finance}
      orbs="drift"
      onPress={() => switchTo('finance')}
      accessibilityLabel="Open Financial Management"
      contentStyle={styles.content}
    >
      <View style={styles.label}>
        <Icon name="credit-card" size={14} color="rgba(255,255,255,0.9)" />
        <Text variant="labelMedium" style={styles.whiteMuted}>
          FINANCIAL MANAGEMENT
        </Text>
      </View>

      {withFigures ? (
        <View style={styles.figures}>
          <View style={styles.line}>
            <MoneyText
              variant="headlineLarge"
              amountMinor={overview.available}
              currency={overview.account.currency}
              style={styles.white}
            />
            <Text variant="bodyMedium" style={styles.whiteMuted}>
              available
            </Text>
          </View>
          <View style={styles.line}>
            <MoneyText
              variant="labelLarge"
              amountMinor={overview.summary.kept}
              currency={overview.account.currency}
              compact
              style={styles.white}
            />
            <Text variant="bodySmall" style={styles.whiteMuted}>
              saved this month
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.figures}>
          <Text variant="titleLarge" style={styles.white}>
            Where is your money going?
          </Text>
          <Text variant="bodySmall" style={styles.whiteMuted}>
            Spending, income and your balance, in their own calm workspace.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text variant="labelLarge" style={styles.white}>
          View financial overview
        </Text>
        <Icon name="arrow-right" size={16} color="#FFFFFF" />
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  figures: {
    gap: 4,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.35)',
    paddingTop: 10,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.9)',
  },
});
