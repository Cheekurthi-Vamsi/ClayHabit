import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoneyText } from '@/components/finance/money-text';
import { TransactionRow } from '@/components/finance/transaction-row';
import { useDockSpace } from '@/components/navigation/floating-dock';
import { Button, Card, EmptyState, ErrorState, IconButton, SegmentedControl, Skeleton, Text } from '@/components/ui';
import type { FinTransactionView, MonthKey } from '@/domain/finance/entities';
import { EMPTY_TOTALS } from '@/domain/finance/entities';
import { addMonths, formatDayLabel, formatMonthLabel, monthKeyOf } from '@/domain/finance/month';
import { radii, useAppTheme } from '@/theme';
import { addDaysIso, todayIso } from '@/utils/date';

import { useCurrency, useMonthTotals, useMonthTransactions } from '../hooks';

type Filter = 'all' | 'expense' | 'income';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Received' },
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DaySection {
  date: string;
  title: string;
  spentMinor: number;
  data: FinTransactionView[];
}

function dayTitle(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDaysIso(today, -1)) return 'Yesterday';
  return `${WEEKDAYS[new Date(`${date}T00:00:00`).getDay()]}, ${formatDayLabel(date)}`;
}

function groupByDay(transactions: readonly FinTransactionView[], today: string): DaySection[] {
  const sections: DaySection[] = [];
  for (const transaction of transactions) {
    let section = sections[sections.length - 1];
    if (!section || section.date !== transaction.occurredOn) {
      section = { date: transaction.occurredOn, title: dayTitle(transaction.occurredOn, today), spentMinor: 0, data: [] };
      sections.push(section);
    }
    section.data.push(transaction);
    if (transaction.type === 'expense') section.spentMinor += transaction.amountMinor;
  }
  return sections;
}

function MonthSummaryCard({ monthKey, currency }: { monthKey: MonthKey; currency: string }) {
  const theme = useAppTheme();
  const totals = useMonthTotals(monthKey).data ?? EMPTY_TOTALS;
  const net = totals.income - totals.expense - totals.saving - totals.transfer;

  const column = (label: string, amount: number, color: 'financeText' | 'textPrimary', sign: 'always' | 'auto') => (
    <View style={styles.summaryColumn}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <MoneyText variant="titleLarge" amountMinor={amount} currency={currency} color={color} sign={sign} numberOfLines={1} adjustsFontSizeToFit />
    </View>
  );

  return (
    <Card style={styles.summary}>
      {column('Received', totals.income, 'financeText', 'auto')}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      {column('Spent', totals.expense, 'textPrimary', 'auto')}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      {column('Net', net, 'textPrimary', 'always')}
    </Card>
  );
}

export function MoneyScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const today = todayIso();
  const currentMonth = monthKeyOf(today);
  const [monthKey, setMonthKey] = useState<MonthKey>(currentMonth);
  const [filter, setFilter] = useState<Filter>('all');
  const currency = useCurrency();
  const { data, isLoading, isError, refetch } = useMonthTransactions(monthKey);

  const visible = (data ?? []).filter((transaction) => filter === 'all' || transaction.type === filter);
  const sections = groupByDay(visible, today);

  const header = (
    <View style={styles.header}>
      <Text variant="displayMedium" accessibilityRole="header">
        Money
      </Text>
      <View style={styles.monthRow}>
        <IconButton
          name="chevron-left"
          variant="muted"
          size={36}
          accessibilityLabel="Previous month"
          onPress={() => setMonthKey((key) => addMonths(key, -1))}
        />
        <Text variant="titleLarge" style={styles.monthLabel} accessibilityLiveRegion="polite">
          {formatMonthLabel(monthKey)}
        </Text>
        <IconButton
          name="chevron-right"
          variant="muted"
          size={36}
          accessibilityLabel="Next month"
          disabled={monthKey >= currentMonth}
          onPress={() => setMonthKey((key) => addMonths(key, 1))}
        />
      </View>
      <MonthSummaryCard monthKey={monthKey} currency={currency} />
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} size="sm" accessibilityLabel="Show" />
    </View>
  );

  const empty = isLoading ? (
    <View style={styles.loading}>
      <Skeleton height={64} radius={theme.radii.md} />
      <Skeleton height={64} radius={theme.radii.md} />
      <Skeleton height={64} radius={theme.radii.md} />
    </View>
  ) : isError ? (
    <ErrorState message="Couldn't load this month's transactions." onRetry={() => refetch()} />
  ) : (
    <Card style={styles.emptyCard}>
      <EmptyState
        icon="inbox"
        title={monthKey === currentMonth && filter === 'all' ? 'Your financial story starts here.' : 'Nothing here'}
        message={
          filter === 'all'
            ? `No transactions in ${formatMonthLabel(monthKey)}.`
            : `No ${filter === 'expense' ? 'spending' : 'income'} in ${formatMonthLabel(monthKey)}.`
        }
      />
      {monthKey === currentMonth ? (
        <Button
          label={filter === 'income' ? 'Add income' : 'Add expense'}
          icon="plus"
          size="sm"
          onPress={() =>
            router.push({ pathname: '/modal/transaction', params: filter === 'income' ? { type: 'income' } : {} })
          }
        />
      ) : null}
    </Card>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md, paddingBottom: dockSpace }]}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text variant="labelLarge" color="textSecondary">
              {section.title}
            </Text>
            {section.spentMinor > 0 ? (
              <MoneyText variant="labelMedium" color="textTertiary" amountMinor={section.spentMinor} currency={currency} />
            ) : null}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.item,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              index === 0 && styles.itemFirst,
              index === section.data.length - 1 && styles.itemLast,
            ]}
          >
            <TransactionRow
              transaction={item}
              currency={currency}
              onPress={() => router.push({ pathname: '/modal/transaction', params: { id: item.id } })}
            />
          </View>
        )}
      />
    </View>
  );
}

// Each row draws its own top hairline, which doubles as the separator between rows.
const RADIUS = radii.lg;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    gap: 14,
    marginBottom: 6,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryColumn: {
    flex: 1,
    gap: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  item: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  itemFirst: {
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  itemLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  },
  loading: {
    gap: 8,
    marginTop: 12,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
});
