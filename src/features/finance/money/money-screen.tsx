import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoneyText } from '@/components/finance/money-text';
import { TransactionRow } from '@/components/finance/transaction-row';
import { useDockSpace } from '@/components/navigation/floating-dock';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  SegmentedControl,
  Skeleton,
  Text,
} from '@/components/ui';
import { EMPTY_TOTALS, PAYMENT_METHODS, type FinTransactionView, type MonthKey, type PaymentMethod } from '@/domain/finance/entities';
import { netChange } from '@/domain/finance/ledger';
import { addMonths, formatDayLabel, formatMonthLabel, monthEnd, monthKeyOf, monthStart } from '@/domain/finance/month';
import { radii, useAppTheme } from '@/theme';
import { addDaysIso, todayIso } from '@/utils/date';

import { CategoryPicker } from '../transaction/category-picker';
import { useCategories, useCurrency, useMonthTotals, useMonthTransactions, useTransactionSearch } from '../hooks';
import { useOpenTransaction } from '../use-open-transaction';

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

function dayTitle(date: string, today: string, withYear: boolean): string {
  if (date === today) return 'Today';
  if (date === addDaysIso(today, -1)) return 'Yesterday';
  const label = `${WEEKDAYS[new Date(`${date}T00:00:00`).getDay()]}, ${formatDayLabel(date)}`;
  return withYear && date.slice(0, 4) !== today.slice(0, 4) ? `${label} ${date.slice(0, 4)}` : label;
}

function groupByDay(transactions: readonly FinTransactionView[], today: string, withYear: boolean): DaySection[] {
  const sections: DaySection[] = [];
  for (const transaction of transactions) {
    let section = sections[sections.length - 1];
    if (!section || section.date !== transaction.occurredOn) {
      section = {
        date: transaction.occurredOn,
        title: dayTitle(transaction.occurredOn, today, withYear),
        spentMinor: 0,
        data: [],
      };
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

  const column = (label: string, amount: number, color: 'financeText' | 'textPrimary', sign: 'always' | 'auto') => (
    <View style={styles.summaryColumn}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <MoneyText
        variant="titleLarge"
        amountMinor={amount}
        currency={currency}
        color={color}
        sign={sign}
        numberOfLines={1}
        adjustsFontSizeToFit
      />
    </View>
  );

  return (
    <Card style={styles.summary}>
      {column('Received', totals.income, 'financeText', 'auto')}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      {column('Spent', totals.expense, 'textPrimary', 'auto')}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      {column('Net', netChange(totals), 'textPrimary', 'always')}
    </Card>
  );
}

export function MoneyScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const openTransaction = useOpenTransaction();
  const today = todayIso();
  const currentMonth = monthKeyOf(today);
  const [monthKey, setMonthKey] = useState<MonthKey>(currentMonth);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const currency = useCurrency();
  const expenseCategories = useCategories('expense').data ?? [];
  const incomeCategories = useCategories('income').data ?? [];

  const searching = query.trim().length > 0;
  const filtering = searching || categoryId !== null || paymentMethod !== null;
  const month = useMonthTransactions(monthKey);
  // A search looks across every month; category/payment filters stay within the month shown.
  const search = useTransactionSearch(
    {
      query: searching ? query : undefined,
      from: searching ? undefined : monthStart(monthKey),
      to: searching ? undefined : monthEnd(monthKey),
      categoryId: categoryId ?? undefined,
      paymentMethod: paymentMethod ?? undefined,
      type: filter === 'all' ? undefined : filter,
    },
    filtering,
  );
  const source = filtering ? search : month;
  const visible = (source.data ?? []).filter((transaction) => filtering || filter === 'all' || transaction.type === filter);
  const sections = groupByDay(visible, today, searching);

  const allCategories = [...expenseCategories, ...incomeCategories];
  const activeCategory = allCategories.find((category) => category.id === categoryId);
  const activeMethod = PAYMENT_METHODS.find((method) => method.key === paymentMethod);
  const filterCount = (categoryId ? 1 : 0) + (paymentMethod ? 1 : 0);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text variant="displayMedium" accessibilityRole="header" style={styles.flex}>
          Money
        </Text>
        <IconButton
          name="tag"
          variant="muted"
          accessibilityLabel="Manage categories"
          onPress={() => router.push('/fm/categories')}
        />
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
          <Icon name="search" size={16} color={theme.colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes, places, categories"
            placeholderTextColor={theme.colors.textTertiary}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search transactions"
            style={[styles.searchInput, theme.typography.bodyMedium, { color: theme.colors.textPrimary }]}
          />
          {searching ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Icon name="x-circle" size={16} color={theme.colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={filterCount ? `Filters, ${filterCount} active` : 'Filters'}
          style={[
            styles.filterButton,
            {
              borderRadius: theme.radii.md,
              backgroundColor: filterCount ? theme.colors.financeMuted : theme.colors.surfaceMuted,
            },
          ]}
        >
          <Icon name="sliders" size={18} color={filterCount ? theme.colors.financeText : theme.colors.textSecondary} />
        </Pressable>
      </View>

      {filterCount ? (
        <View style={styles.chips}>
          {activeCategory ? (
            <Chip label={`${activeCategory.emoji} ${activeCategory.name}  ✕`} selected onPress={() => setCategoryId(null)} />
          ) : null}
          {activeMethod ? <Chip label={`${activeMethod.label}  ✕`} selected onPress={() => setPaymentMethod(null)} /> : null}
        </View>
      ) : null}

      {searching ? (
        <Text variant="bodySmall" color="textSecondary" accessibilityLiveRegion="polite">
          {source.isFetching && !source.data
            ? 'Searching…'
            : `${visible.length} ${visible.length === 1 ? 'result' : 'results'} for “${query.trim()}” in all months`}
        </Text>
      ) : (
        <>
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
        </>
      )}
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} size="sm" accessibilityLabel="Show" />
    </View>
  );

  const empty =
    source.isLoading && !source.data ? (
      <View style={styles.loading}>
        <Skeleton height={64} radius={theme.radii.md} />
        <Skeleton height={64} radius={theme.radii.md} />
        <Skeleton height={64} radius={theme.radii.md} />
      </View>
    ) : source.isError ? (
      <ErrorState message="Couldn't load transactions. Nothing has been lost." onRetry={() => source.refetch()} />
    ) : filtering ? (
      <Card style={styles.emptyCard}>
        <EmptyState icon="search" title="Nothing matches" message="Try another word, or clear the filters." />
        {filterCount ? (
          <Button
            label="Clear filters"
            variant="outline"
            size="sm"
            onPress={() => {
              setCategoryId(null);
              setPaymentMethod(null);
            }}
          />
        ) : null}
      </Card>
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            <TransactionRow transaction={item} currency={currency} onPress={() => openTransaction(item)} />
          </View>
        )}
      />

      <BottomSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        {(close) => (
          <View style={styles.sheet}>
            <Text variant="labelMedium" color="textSecondary">
              CATEGORY
            </Text>
            <CategoryPicker
              categories={filter === 'income' ? incomeCategories : filter === 'expense' ? expenseCategories : allCategories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
            <Text variant="labelMedium" color="textSecondary">
              PAID WITH
            </Text>
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
            <View style={styles.sheetActions}>
              <View style={styles.flex}>
                <Button
                  label="Clear"
                  variant="outline"
                  fullWidth
                  onPress={() => {
                    setCategoryId(null);
                    setPaymentMethod(null);
                  }}
                />
              </View>
              <View style={styles.flex}>
                <Button label="Show results" fullWidth onPress={() => close()} />
              </View>
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

// Each row draws its own top hairline, which doubles as the separator between rows.
const RADIUS = radii.lg;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    gap: 14,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
  },
  filterButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  sheet: {
    gap: 12,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
