import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { PAYMENT_METHODS, type FinTransactionView } from '@/domain/finance/entities';
import { formatDayLabel } from '@/domain/finance/month';
import { useAppTheme } from '@/theme';
import { formatTime12h } from '@/utils/date';

import { CategoryGlyph } from './category-glyph';
import { MoneyText } from './money-text';

interface TransactionRowProps {
  transaction: FinTransactionView;
  currency: string;
  onPress?: () => void;
  /** Show the day instead of the time (for lists not grouped by day). */
  showDate?: boolean;
}

function timeOf(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatTime12h(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`);
}

export function transactionTitle(transaction: FinTransactionView): string {
  if (transaction.type === 'saving' || transaction.type === 'withdrawal') {
    return transaction.savingsPlan?.name ?? 'Savings';
  }
  return (
    transaction.merchant ??
    transaction.note ??
    transaction.category?.name ??
    (transaction.type === 'income' ? 'Income' : 'Expense')
  );
}

const TYPE_DETAIL: Partial<Record<FinTransactionView['type'], string>> = {
  saving: 'Set aside',
  withdrawal: 'From savings',
  transfer: 'Transfer',
};

export function TransactionRow({ transaction, currency, onPress, showDate = false }: TransactionRowProps) {
  const theme = useAppTheme();
  const title = transactionTitle(transaction);
  // Money coming in, whether earned or taken back out of savings.
  const moneyIn = transaction.type === 'income' || transaction.type === 'withdrawal';
  const savings = transaction.type === 'saving' || transaction.type === 'withdrawal';
  const method = PAYMENT_METHODS.find((item) => item.key === transaction.paymentMethod)?.label;
  const details = [
    TYPE_DETAIL[transaction.type] ?? null,
    transaction.category && transaction.category.name !== title ? transaction.category.name : null,
    showDate ? formatDayLabel(transaction.occurredOn) : timeOf(transaction.occurredAt),
    method,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? (savings ? 'Opens its savings plan' : 'Opens this transaction to edit it') : undefined}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.surfacePressed }]}
    >
      <CategoryGlyph
        emoji={
          savings ? (transaction.savingsPlan?.emoji ?? '🎯') : (transaction.category?.emoji ?? (moneyIn ? '💵' : '🏷️'))
        }
        color={savings ? 'mint' : (transaction.category?.color ?? 'purple')}
      />
      <View style={styles.body}>
        <Text variant="titleMedium" numberOfLines={1}>
          {title}
        </Text>
        {details.length > 0 ? (
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {details.join(' · ')}
          </Text>
        ) : null}
      </View>
      <MoneyText
        variant="titleMedium"
        amountMinor={transaction.amountMinor}
        currency={currency}
        sign={moneyIn ? 'always' : 'never'}
        color={moneyIn ? 'financeText' : transaction.type === 'saving' ? 'textSecondary' : 'textPrimary'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
