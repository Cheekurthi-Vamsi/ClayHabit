import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import { amountTextToMinor, applyAmountKey, minorToAmountText, type AmountKey } from '@/domain/finance/amount-entry';
import { currencyOf } from '@/domain/finance/currency';
import { useAppTheme } from '@/theme';

interface AmountFieldProps {
  label: string;
  currency: string;
  /** Initial value in minor units; the field keeps its own text after that. */
  initialMinor?: number | null;
  placeholder?: string;
  hint?: string;
  onChange: (minor: number | null) => void;
}

/**
 * An amount input for forms with several amounts, where the big keypad would
 * be awkward. Typed text runs through the same rules as the keypad, so it
 * can't hold two decimal points or too many decimals.
 */
export function AmountField({ label, currency, initialMinor, placeholder = '0', hint, onChange }: AmountFieldProps) {
  const theme = useAppTheme();
  const config = currencyOf(currency);
  const [text, setText] = useState(initialMinor ? minorToAmountText(initialMinor, config.decimals) : '');

  const handle = (raw: string) => {
    const normalized = raw.replace(/,/g, '.');
    let next = '';
    for (const char of normalized) {
      if (/[0-9.]/.test(char)) next = applyAmountKey(next, char as AmountKey, config.decimals);
    }
    setText(next);
    const minor = amountTextToMinor(next);
    onChange(minor > 0 ? minor : null);
  };

  return (
    <View style={styles.field}>
      <Text variant="labelMedium" color="textSecondary">
        {label}
      </Text>
      <View style={[styles.box, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
        <Text variant="titleMedium" color="textSecondary">
          {config.symbol}
        </Text>
        <TextInput
          value={text}
          onChangeText={handle}
          keyboardType={config.decimals === 0 ? 'number-pad' : 'decimal-pad'}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel={label}
          style={[styles.input, theme.typography.titleMedium, { color: theme.colors.textPrimary }]}
        />
      </View>
      {hint ? (
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
});
