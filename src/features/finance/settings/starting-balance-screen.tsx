import { useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountDisplay } from '@/components/finance/amount-display';
import { MoneyKeypad } from '@/components/finance/money-keypad';
import { Button, Skeleton, Text } from '@/components/ui';
import { amountTextToMinor, applyAmountKey, minorToAmountText } from '@/domain/finance/amount-entry';
import { currencyOf } from '@/domain/finance/currency';
import type { FinAccount } from '@/domain/finance/entities';
import { useAppTheme } from '@/theme';

import { useFinanceAccount, useUpdateAccount } from '../hooks';

function StartingBalanceForm({ account }: { account: FinAccount }) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { decimals } = currencyOf(account.currency);
  const [text, setText] = useState(
    account.openingBalanceMinor > 0 ? minorToAmountText(account.openingBalanceMinor, decimals) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateAccount();

  const save = () =>
    update.mutate(
      { openingBalanceMinor: amountTextToMinor(text) },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (cause) =>
          setError(`Couldn't save your starting balance. Nothing has been lost. ${cause instanceof Error ? cause.message : ''}`),
      },
    );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.top}>
        <Text variant="bodyMedium" color="textSecondary" style={styles.center}>
          What you had before your first recorded transaction. Your available balance is this plus everything you
          record after it.
        </Text>
        <AmountDisplay text={text} currency={account.currency} />
        {error ? (
          <Text variant="bodySmall" color="error" style={styles.center} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.bottom}>
        <MoneyKeypad
          decimals={decimals}
          onKey={(key) => setText((current) => applyAmountKey(current, key, decimals))}
          onClear={() => setText('')}
        />
        <Button
          label="Save starting balance"
          icon="check"
          fullWidth
         
          loading={update.isPending}
          onPress={save}
        />
      </View>
    </View>
  );
}

export function StartingBalanceScreen() {
  const theme = useAppTheme();
  const { data: account } = useFinanceAccount();

  if (!account) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <Skeleton height={80} radius={theme.radii.md} />
      </View>
    );
  }
  return <StartingBalanceForm account={account} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  top: {
    gap: 24,
    paddingTop: 12,
  },
  bottom: {
    gap: 10,
  },
  center: {
    textAlign: 'center',
  },
});
