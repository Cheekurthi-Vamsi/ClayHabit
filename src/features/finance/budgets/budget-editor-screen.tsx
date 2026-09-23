import { useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountDisplay } from '@/components/finance/amount-display';
import { MoneyKeypad } from '@/components/finance/money-keypad';
import { MoneyText } from '@/components/finance/money-text';
import { Button, Chip, Skeleton, Text } from '@/components/ui';
import { amountTextToMinor, applyAmountKey, minorToAmountText } from '@/domain/finance/amount-entry';
import type { BudgetPicture } from '@/domain/finance/budget';
import { currencyOf } from '@/domain/finance/currency';
import type { MonthKey } from '@/domain/finance/entities';
import { formatMonthLabel, isMonthKey, monthKeyOf } from '@/domain/finance/month';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useBudgetPicture, useCategories, useCurrency, useRemoveBudget, useSetBudget } from '../hooks';
import { CategoryPicker } from '../transaction/category-picker';

const OVERALL = '__overall__';

function BudgetEditor({
  picture,
  month,
  initialTarget,
}: {
  picture: BudgetPicture;
  month: MonthKey;
  /** A category id, OVERALL, or null to let the person choose. */
  initialTarget: string | null;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useCurrency();
  const { decimals } = currencyOf(currency);
  const categories = useCategories('expense').data ?? [];
  const setBudget = useSetBudget();
  const removeBudget = useRemoveBudget();

  const [target, setTarget] = useState<string | null>(initialTarget);
  const existingFor = (key: string | null) =>
    key === OVERALL ? picture.overall : (picture.lines.find((line) => line.categoryId === key) ?? null);
  const existing = existingFor(target);
  const [amountText, setAmountText] = useState(existing ? minorToAmountText(existing.usage.limitMinor, decimals) : '');
  const [error, setError] = useState<string | null>(null);

  const amountMinor = amountTextToMinor(amountText);
  const categoryId = target === OVERALL ? null : target;
  const spent =
    target === OVERALL
      ? picture.totalSpentMinor
      : (existing?.usage.spentMinor ?? picture.unbudgeted.find((item) => item.id === target)?.spentMinor ?? 0);

  const choose = (next: string | null) => {
    setTarget(next);
    const line = existingFor(next);
    setAmountText(line ? minorToAmountText(line.usage.limitMinor, decimals) : '');
    setError(null);
  };

  const done = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };
  const failed = (cause: unknown) =>
    setError(`Couldn't save this budget. Nothing has been lost. ${cause instanceof Error ? cause.message : ''}`);

  const save = () => {
    if (!target || amountMinor <= 0) return;
    setBudget.mutate({ categoryId, amountMinor, month }, { onSuccess: done, onError: failed });
  };

  const remove = () => removeBudget.mutate({ categoryId, month }, { onSuccess: done, onError: failed });

  const title = target === OVERALL ? 'Monthly limit' : existing ? `${existing.name} budget` : 'New budget';

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.top} keyboardShouldPersistTaps="handled">
        {initialTarget === null ? (
          <View style={styles.field}>
            <Text variant="labelMedium" color="textSecondary">
              BUDGET FOR
            </Text>
            <Chip label="🧾 All spending" selected={target === OVERALL} onPress={() => choose(OVERALL)} />
            <CategoryPicker
              categories={categories}
              selectedId={target === OVERALL ? null : target}
              onSelect={(id) => choose(id)}
            />
          </View>
        ) : null}

        <AmountDisplay text={amountText} currency={currency} />

        {target ? (
          <View style={[styles.hint, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
            <Text variant="caption" color="textSecondary">
              {`Spent so far in ${formatMonthLabel(month).split(' ')[0]}: `}
            </Text>
            <MoneyText variant="labelMedium" amountMinor={spent} currency={currency} />
          </View>
        ) : (
          <Text variant="bodySmall" color="textSecondary" style={styles.center}>
            Choose what this budget covers.
          </Text>
        )}

        <Text variant="caption" color="textTertiary" style={styles.center}>
          Applies from {formatMonthLabel(month)} on. Earlier months keep their own limits.
        </Text>

        {error ? (
          <Text variant="bodySmall" color="error" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12, borderTopColor: theme.colors.border }]}>
        <MoneyKeypad
          decimals={decimals}
          keyHeight={48}
          onKey={(key) => setAmountText((text) => applyAmountKey(text, key, decimals))}
          onClear={() => setAmountText('')}
        />
        <Button
          label={existing ? 'Save budget' : 'Set budget'}
          icon="check"
          fullWidth
          gradient={theme.gradients.finance}
          disabled={!target || amountMinor <= 0}
          loading={setBudget.isPending}
          onPress={save}
        />
        {existing ? (
          <Button label="Remove this budget" variant="ghost" size="sm" loading={removeBudget.isPending} onPress={remove} />
        ) : null}
      </View>
    </View>
  );
}

/** Set or change a budget: `?month=&categoryId=` or `?scope=overall`; neither lets the person choose. */
export function BudgetEditorScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ month?: string; categoryId?: string; scope?: string }>();
  const month = params.month && isMonthKey(params.month) ? params.month : monthKeyOf(todayIso());
  const { data: picture } = useBudgetPicture(month);

  if (!picture) {
    return (
      <View style={[styles.screen, styles.top, { backgroundColor: theme.colors.background }]}>
        <Skeleton height={80} radius={theme.radii.md} />
      </View>
    );
  }

  const initialTarget = params.scope === 'overall' ? OVERALL : (params.categoryId ?? null);
  return <BudgetEditor picture={picture} month={month} initialTarget={initialTarget} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  top: {
    padding: 20,
    gap: 18,
  },
  field: {
    gap: 8,
    alignItems: 'flex-start',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  center: {
    textAlign: 'center',
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
