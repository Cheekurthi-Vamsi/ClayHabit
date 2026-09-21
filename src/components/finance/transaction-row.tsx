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
  return (
    transaction.merchant ??
    transaction.note ??
    transaction.category?.name ??
    (transaction.type === 'income' ? 'Income' : 'Expense')
  );
}

export function TransactionRow({ transaction, currency, onPress, showDate = false }: TransactionRowProps) {
  const theme = useAppTheme();
  const title = transactionTitle(transaction);
  const income = transaction.type === 'income';
  const method = PAYMENT_METHODS.find((item) => item.key === transaction.paymentMethod)?.label;
  const details = [
    transaction.category && transaction.category.name !== title ? transaction.category.name : null,
    showDate ? formatDayLabel(transaction.occurredOn) : timeOf(transaction.occurredAt),
    method,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Opens this transaction to edit it' : undefined}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.surfacePressed }]}
    >
      <CategoryGlyph
        emoji={transaction.category?.emoji ?? (income ? '💵' : '🏷️')}
        color={transaction.category?.color ?? 'purple'}
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
        sign={income ? 'always' : 'never'}
        color={income ? 'financeText' : 'textPrimary'}
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
