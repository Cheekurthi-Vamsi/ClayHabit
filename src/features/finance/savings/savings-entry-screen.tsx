import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountDisplay } from '@/components/finance/amount-display';
import { DayPicker } from '@/components/finance/day-picker';
import { MoneyKeypad } from '@/components/finance/money-keypad';
import { MoneyText } from '@/components/finance/money-text';
import { Button, Chip, EmptyState, SegmentedControl, Text } from '@/components/ui';
import { amountTextToMinor, applyAmountKey } from '@/domain/finance/amount-entry';
import { currencyOf } from '@/domain/finance/currency';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useCurrency, useFinanceOverview, useSavingsMutations, useSavingsPlans } from '../hooks';

type Kind = 'deposit' | 'withdraw';

const KINDS = [
  { value: 'deposit', label: 'Add money' },
  { value: 'withdraw', label: 'Withdraw' },
] as const;

/** Put money into a plan, or take some back out (`?planId=&kind=`). */
export function SavingsEntryScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planId?: string; kind?: string }>();
  const currency = useCurrency();
  const { decimals } = currencyOf(currency);
  const { data: plans } = useSavingsPlans();
  const { data: overview } = useFinanceOverview();
  const { addEntry } = useSavingsMutations();

  const [kind, setKind] = useState<Kind>(params.kind === 'withdraw' ? 'withdraw' : 'deposit');
  const [planId, setPlanId] = useState<string | null>(params.planId ?? null);
  const [amountText, setAmountText] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  const activePlans = plans ?? [];
  const selectedPlanId = planId ?? (activePlans.length === 1 ? activePlans[0].id : null);
  const plan = activePlans.find((item) => item.id === selectedPlanId);
  const amountMinor = amountTextToMinor(amountText);
  const overdraw = kind === 'withdraw' && plan !== undefined && amountMinor > plan.savedMinor;

  if (plans && activePlans.length === 0) {
    return (
      <View style={[styles.screen, styles.padded, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Savings' }} />
        <EmptyState icon="target" title="No savings plans yet" message="Create a plan first, then add money to it." />
        <Button
          label="Create a savings plan"
          icon="plus"
          gradient={theme.gradients.finance}
          onPress={() => router.replace('/modal/savings-plan')}
        />
      </View>
    );
  }

  const submit = () => {
    if (!selectedPlanId || amountMinor <= 0 || overdraw) return;
    addEntry.mutate(
      { planId: selectedPlanId, kind, amountMinor, occurredOn },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (cause) =>
          setError(`Couldn't save this. Your information hasn't been lost. ${cause instanceof Error ? cause.message : ''}`),
      },
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: kind === 'deposit' ? 'Add to savings' : 'Withdraw from savings' }} />
      <ScrollView contentContainerStyle={[styles.padded, styles.top]} keyboardShouldPersistTaps="handled">
        <View style={styles.kind}>
          <SegmentedControl options={KINDS} value={kind} onChange={setKind} size="sm" accessibilityLabel="Add or withdraw" />
        </View>

        <AmountDisplay text={amountText} currency={currency} color={kind === 'deposit' ? theme.colors.financeText : undefined} />

        {!params.planId && activePlans.length > 1 ? (
          <View style={styles.field}>
            <Text variant="labelMedium" color="textSecondary">
              {kind === 'deposit' ? 'SAVE TOWARD' : 'TAKE FROM'}
            </Text>
            <View style={styles.wrap}>
              {activePlans.map((item) => (
                <Chip
                  key={item.id}
                  label={`${item.emoji} ${item.name}`}
                  selected={item.id === selectedPlanId}
                  onPress={() => setPlanId(item.id)}
                />
              ))}
            </View>
          </View>
        ) : plan ? (
          <Text variant="titleMedium" style={styles.center}>
            {plan.emoji} {plan.name}
          </Text>
        ) : null}

        <View style={styles.field}>
          <Text variant="labelMedium" color="textSecondary">
            WHEN
          </Text>
          <DayPicker value={occurredOn} onChange={setOccurredOn} />
        </View>

        <View style={[styles.hint, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
          <Text variant="caption" color="textSecondary">
            {kind === 'deposit' ? 'Available to spend now: ' : 'In this plan: '}
          </Text>
          <MoneyText
            variant="labelMedium"
            amountMinor={kind === 'deposit' ? (overview?.available ?? 0) : (plan?.savedMinor ?? 0)}
            currency={currency}
          />
        </View>
        {overdraw ? (
          <Text variant="bodySmall" color="error" accessibilityRole="alert">
            That&apos;s more than this plan holds.
          </Text>
        ) : null}
        {error ? (
          <Text variant="bodySmall" color="error" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[styles.bottom, { paddingBottom: insets.bottom + 12, borderTopColor: theme.colors.border }]}
      >
        <MoneyKeypad
          decimals={decimals}
          keyHeight={48}
          onKey={(key) => {
            setAmountText((text) => applyAmountKey(text, key, decimals));
            setError(null);
          }}
          onClear={() => setAmountText('')}
        />
        <Button
          label={kind === 'deposit' ? 'Add to plan' : 'Withdraw'}
          icon="check"
          fullWidth
          gradient={theme.gradients.finance}
          disabled={amountMinor <= 0 || !selectedPlanId || overdraw}
          loading={addEntry.isPending}
          onPress={submit}
          accessibilityHint={!selectedPlanId ? 'Choose a plan first' : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  padded: {
    padding: 20,
  },
  top: {
    gap: 18,
  },
  kind: {
    alignSelf: 'center',
    width: 260,
  },
  field: {
    gap: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  center: {
    textAlign: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
