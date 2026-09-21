import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { GradientCard, Icon, Text, type IconName } from '@/components/ui';
import type { MonthKey } from '@/domain/finance/entities';
import type { MonthSummary } from '@/domain/finance/ledger';
import { formatMonthLabel } from '@/domain/finance/month';
import { fontFamily, useAppTheme } from '@/theme';

function FlowPill({ icon, amountMinor, currency, label }: { icon: IconName; amountMinor: number; currency: string; label: string }) {
  return (
    <View style={styles.pill}>
      <Icon name={icon} size={13} color="#FFFFFF" />
      <MoneyText
        variant="labelLarge"
        amountMinor={amountMinor}
        currency={currency}
        compact
        style={styles.white}
      />
      <Text variant="caption" style={styles.whiteMuted}>
        {label}
      </Text>
    </View>
  );
}

interface BalanceHeroCardProps {
  availableMinor: number;
  summary: MonthSummary;
  monthKey: MonthKey;
  currency: string;
}

/** The number the finance dashboard leads with: what's available right now. */
export function BalanceHeroCard({ availableMinor, summary, monthKey, currency }: BalanceHeroCardProps) {
  const theme = useAppTheme();
  const month = formatMonthLabel(monthKey).split(' ')[0];

  return (
    <GradientCard gradient={theme.gradients.finance} orbs="glow" contentStyle={styles.content}>
      <Text variant="labelMedium" style={styles.whiteMuted}>
        TOTAL AVAILABLE
      </Text>
      <MoneyText
        amountMinor={availableMinor}
        currency={currency}
        countUpKey="finance.available"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={styles.hero}
      />
      <View style={styles.pills}>
        <FlowPill icon="arrow-down-left" amountMinor={summary.income} currency={currency} label="in" />
        <FlowPill icon="arrow-up-right" amountMinor={summary.expense} currency={currency} label="out" />
      </View>
      <View style={styles.footer}>
        <Text variant="caption" style={styles.whiteMuted}>
          {`${month} started at `}
        </Text>
        <MoneyText variant="caption" amountMinor={summary.startBalance} currency={currency} style={styles.whiteMuted} />
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingVertical: 22,
  },
  hero: {
    color: '#FFFFFF',
    fontFamily: fontFamily.extraBold,
    fontSize: 46,
    lineHeight: 54,
    letterSpacing: -1.2,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.35)',
    paddingTop: 10,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.88)',
  },
});
