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
      <Icon name={icon} size={13} color={INK} />
      <MoneyText
        variant="labelLarge"
        amountMinor={amountMinor}
        currency={currency}
        compact
        style={styles.ink}
      />
      <Text variant="caption" style={styles.inkMuted}>
        {label}
      </Text>
    </View>
  );
}

interface BalanceHeroCardProps {
  availableMinor: number;
  /** Money in savings plans — set aside, so not part of the available balance. */
  savedInPlansMinor: number;
  summary: MonthSummary;
  monthKey: MonthKey;
  currency: string;
}

/** Dark ink on the #CFF400 lime card. */
const INK = '#141512';
const INK_MUTED = 'rgba(20, 21, 18, 0.72)';

/** The number the finance dashboard leads with: what's available right now, on the lime card. */
export function BalanceHeroCard({ availableMinor, savedInPlansMinor, summary, monthKey, currency }: BalanceHeroCardProps) {
  const theme = useAppTheme();
  const month = formatMonthLabel(monthKey).split(' ')[0];

  return (
    <GradientCard
      gradient={[theme.colors.highlight, theme.colors.highlight, '#B9DA00']}
      orbs={false}
      contentStyle={styles.content}
    >
      <Text variant="labelMedium" style={styles.inkMuted}>
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
        <View style={styles.footerItem}>
          <Text variant="caption" style={styles.inkMuted}>
            {`${month} started at `}
          </Text>
          <MoneyText variant="caption" amountMinor={summary.startBalance} currency={currency} style={styles.inkMuted} />
        </View>
        {savedInPlansMinor > 0 ? (
          <View style={styles.footerItem}>
            <Icon name="shield" size={12} color={INK} />
            <MoneyText variant="caption" amountMinor={savedInPlansMinor} currency={currency} style={styles.ink} />
            <Text variant="caption" style={styles.inkMuted}>
              {' in savings'}
            </Text>
          </View>
        ) : null}
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
    color: INK,
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
    backgroundColor: 'rgba(20, 21, 18, 0.08)',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(20, 21, 18, 0.18)',
    paddingTop: 10,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ink: {
    color: INK,
  },
  inkMuted: {
    color: INK_MUTED,
  },
});
