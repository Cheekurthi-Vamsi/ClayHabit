import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatAmountText } from '@/domain/finance/amount-entry';
import { currencyOf } from '@/domain/finance/currency';
import { fontFamily, useAppTheme } from '@/theme';

interface AmountDisplayProps {
  /** Keypad text, e.g. "450.5". */
  text: string;
  currency: string;
  /** Tint for the digits once something is typed. */
  color?: string;
  accessibilityLabel?: string;
}

/** The big number at the top of an entry screen. Shrinks to fit rather than wrapping. */
export function AmountDisplay({ text, currency, color, accessibilityLabel }: AmountDisplayProps) {
  const theme = useAppTheme();
  const config = currencyOf(currency);
  const empty = text === '' || text === '0';
  const digitColor = empty ? theme.colors.textTertiary : (color ?? theme.colors.textPrimary);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `Amount ${config.symbol}${formatAmountText(text, config)}`}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.symbol, { color: theme.colors.textSecondary }]}>{config.symbol}</Text>
      <Text
        style={[styles.digits, { color: digitColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.4}
      >
        {formatAmountText(text, config)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  symbol: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 40,
    marginTop: 8,
  },
  digits: {
    flexShrink: 1,
    fontFamily: fontFamily.extraBold,
    fontSize: 56,
    lineHeight: 66,
    letterSpacing: -1.5,
  },
});
