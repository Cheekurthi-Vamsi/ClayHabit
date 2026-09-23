import * as Haptics from '@/lib/haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import type { AmountKey } from '@/domain/finance/amount-entry';
import { useAppTheme } from '@/theme';

const ROWS: readonly (readonly AmountKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

interface MoneyKeypadProps {
  onKey: (key: AmountKey) => void;
  /** Long-press on backspace. */
  onClear: () => void;
  /** Hides the decimal point for currencies without decimals. */
  decimals: 0 | 2;
  keyHeight?: number;
}

/**
 * An in-app number pad: always the same layout and decimal separator, never
 * covers the screen like the system keyboard, and needs no focus management.
 */
export function MoneyKeypad({ onKey, onClear, decimals, keyHeight = 52 }: MoneyKeypadProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.pad}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((key) => {
            if (key === '.' && decimals === 0) return <View key={key} style={styles.key} />;
            const label = key === 'back' ? 'Delete' : key === '.' ? 'Decimal point' : key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  Haptics.selectionAsync();
                  onKey(key);
                }}
                onLongPress={
                  key === 'back'
                    ? () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onClear();
                      }
                    : undefined
                }
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={key === 'back' ? 'Long press to clear' : undefined}
                style={({ pressed }) => [
                  styles.key,
                  {
                    height: keyHeight,
                    borderRadius: theme.radii.md,
                    backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent',
                  },
                ]}
              >
                {key === 'back' ? (
                  <Icon name="delete" size={22} color={theme.colors.textPrimary} />
                ) : (
                  <Text variant="headlineLarge">{key}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
