import { useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountDisplay } from '@/components/finance/amount-display';
import { DayPicker } from '@/components/finance/day-picker';
import { MoneyKeypad } from '@/components/finance/money-keypad';
import { Button, Chip, EmptyState, Icon, IconButton, SegmentedControl, Skeleton, Text } from '@/components/ui';
import { amountTextToMinor, applyAmountKey, minorToAmountText } from '@/domain/finance/amount-entry';
import { currencyOf } from '@/domain/finance/currency';
import { PAYMENT_METHODS, type FinTransactionView, type PaymentMethod } from '@/domain/finance/entities';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import {
  useCategories,
  useCreateTransaction,
  useCurrency,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '../hooks';
import { CategoryPicker } from './category-picker';

type EntryType = 'expense' | 'income';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="labelMedium" color="textSecondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

function TransactionForm({ existing, initialType }: { existing?: FinTransactionView; initialType: EntryType }) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const currency = useCurrency();
  const { decimals } = currencyOf(currency);
  const today = todayIso();

  const [type, setType] = useState<EntryType>(existing?.type === 'income' ? 'income' : initialType);
  const [amountText, setAmountText] = useState(existing ? minorToAmountText(existing.amountMinor, decimals) : '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [occurredOn, setOccurredOn] = useState(existing?.occurredOn ?? today);
  const [note, setNote] = useState(existing?.note ?? '');
  const [merchant, setMerchant] = useState(existing?.merchant ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(existing?.paymentMethod ?? null);
  const [showDetails, setShowDetails] = useState(Boolean(existing?.merchant || existing?.paymentMethod));
  const [error, setError] = useState<string | null>(null);

  const categories = useCategories(type).data ?? [];
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const saving = create.isPending || update.isPending;
  const amountMinor = amountTextToMinor(amountText);
  const noun = type === 'income' ? 'income' : 'expense';

  const changeType = (next: EntryType) => {
    if (next === type) return;
    setType(next);
    // Expense and income categories are separate lists.
    setCategoryId(null);
    setError(null);
  };

  const failed = (cause: unknown) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(cause instanceof Error ? cause.message : String(cause));
  };

  const submit = () => {
    if (amountMinor <= 0 || saving) return;
    const input = { type, amountMinor, categoryId, occurredOn, note, merchant, paymentMethod };
    const options = {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
      onError: failed,
    };
    if (existing) update.mutate({ id: existing.id, input }, options);
    else create.mutate(input, options);
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(`Delete this ${noun}?`, 'It will be removed from your balance and lists.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(existing.id, { onSuccess: () => router.back(), onError: failed }),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: `${existing ? 'Edit' : 'Add'} ${noun}`,
          headerRight: existing
            ? () => (
                <IconButton name="trash-2" variant="ghost" accessibilityLabel={`Delete this ${noun}`} onPress={confirmDelete} />
              )
            : undefined,
        }}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.typeSwitch}>
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} size="sm" accessibilityLabel="Type" />
        </View>

        <AmountDisplay
          text={amountText}
          currency={currency}
          color={type === 'income' ? theme.colors.financeText : undefined}
        />

        <Field label={type === 'income' ? 'WHERE DID IT COME FROM?' : 'WHAT WAS THIS?'}>
          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
        </Field>

        <Field label="WHEN">
          <DayPicker value={occurredOn} onChange={setOccurredOn} />
        </Field>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={200}
          returnKeyType="done"
          accessibilityLabel="Note"
          style={[
            styles.input,
            theme.typography.bodyLarge,
            { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
          ]}
        />

        <Pressable
          onPress={() => setShowDetails((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
          style={styles.detailsToggle}
        >
          <Text variant="labelLarge" color="financeText">
            {showDetails ? 'Fewer details' : 'More details'}
          </Text>
          <Icon name={showDetails ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.financeText} />
        </Pressable>

        {showDetails ? (
          <View style={styles.details}>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder={type === 'income' ? 'From (e.g. employer, client)' : 'Where (e.g. shop, restaurant)'}
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={80}
              accessibilityLabel={type === 'income' ? 'From' : 'Merchant'}
              style={[
                styles.input,
                theme.typography.bodyLarge,
                { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
              ]}
            />
            <Field label="PAID WITH">
              <View style={styles.chips}>
                {PAYMENT_METHODS.map((method) => (
                  <Chip
                    key={method.key}
                    label={method.label}
                    selected={paymentMethod === method.key}
                    onPress={() => setPaymentMethod(paymentMethod === method.key ? null : method.key)}
                  />
                ))}
              </View>
            </Field>
          </View>
        ) : null}

        {error ? (
          <View
            style={[styles.error, { backgroundColor: theme.colors.errorMuted, borderRadius: theme.radii.md }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Icon name="alert-circle" size={18} color={theme.colors.error} />
            <View style={styles.flex}>
              <Text variant="labelLarge">Couldn&apos;t save this {noun}.</Text>
              <Text variant="bodySmall" color="textSecondary">
                Your information hasn&apos;t been lost. {error}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + 12, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
        ]}
      >
        {keyboardVisible ? null : (
          <MoneyKeypad
            decimals={decimals}
            keyHeight={48}
            onKey={(key) => {
              setAmountText((text) => applyAmountKey(text, key, decimals));
              setError(null);
            }}
            onClear={() => setAmountText('')}
          />
        )}
        <Button
          label={existing ? 'Save changes' : `Add ${noun}`}
          icon="check"
          fullWidth
          gradient={theme.gradients.finance}
          disabled={amountMinor <= 0}
          loading={saving}
          onPress={submit}
          accessibilityHint={amountMinor <= 0 ? 'Enter an amount first' : undefined}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/** Add (`?type=income`) or edit (`?id=…`) an expense or income. */
export function TransactionScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const { data: existing, isLoading } = useTransaction(id);

  if (id && isLoading) {
    return (
      <View style={[styles.screen, styles.content, { backgroundColor: theme.colors.background }]}>
        <Skeleton height={70} radius={theme.radii.md} />
        <Skeleton height={100} radius={theme.radii.md} />
      </View>
    );
  }

  // Savings entries belong to their plan; editing them as an expense would change what they are.
  if (existing?.savingsPlanId) {
    const planId = existing.savingsPlanId;
    return (
      <View style={[styles.screen, styles.content, { backgroundColor: theme.colors.background }]}>
        <EmptyState icon="shield" title="A savings entry" message="Money moved in or out of savings is managed from its plan." />
        <Button label="Open the plan" variant="outline" onPress={() => router.replace(`/fm/savings/${planId}`)} />
      </View>
    );
  }

  if (id && !existing) {
    return (
      <View style={[styles.screen, styles.content, { backgroundColor: theme.colors.background }]}>
        <EmptyState icon="inbox" title="Not found" message="This transaction no longer exists." />
        <Button label="Close" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <TransactionForm
      key={existing?.id ?? 'new'}
      existing={existing ?? undefined}
      initialType={type === 'income' ? 'income' : 'expense'}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  typeSwitch: {
    alignSelf: 'center',
    width: 240,
  },
  field: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  details: {
    gap: 14,
  },
  error: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
