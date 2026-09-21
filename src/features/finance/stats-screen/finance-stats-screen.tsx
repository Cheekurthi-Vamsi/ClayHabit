import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryGlyph } from '@/components/finance/category-glyph';
import { MoneyText } from '@/components/finance/money-text';
import { transactionTitle } from '@/components/finance/transaction-row';
import { useDockSpace } from '@/components/navigation/floating-dock';
import { Card, EmptyState, ErrorState, GroupedBarChart, Icon, Skeleton, Stagger, Text } from '@/components/ui';
import { formatMoney } from '@/domain/finance/currency';
import { formatMonthLabel } from '@/domain/finance/month';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { useFinanceStats } from '../hooks';

function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card style={styles.kpi}>
      <Text variant="labelMedium" color="textSecondary">
        {label}
      </Text>
      {children}
    </Card>
  );
}

/** Six months of money in and out, this month's figures, and what changed by category. */
export function FinanceStatsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const { data: stats, isLoading, isError, refetch } = useFinanceStats();
  const [selected, setSelected] = useState<number | null>(null);

  const months = stats?.months ?? [];
  const index = selected ?? (months.length ? months.length - 1 : null);
  const month = index !== null ? months[index] : undefined;
  const hasData = months.some((flow) => flow.income > 0 || flow.expense > 0);
  const currency = stats?.currency ?? 'INR';

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md, paddingBottom: dockSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <Stagger index={0} style={styles.header}>
          <Text variant="displayMedium" accessibilityRole="header">
            Stats
          </Text>
          <Text variant="bodyMedium" color="textSecondary">
            Where your money has been going, month by month.
          </Text>
        </Stagger>

        {isLoading && !stats ? (
          <View style={styles.section}>
            <Skeleton height={260} radius={theme.radii.lg} />
            <Skeleton height={160} radius={theme.radii.lg} />
          </View>
        ) : isError || !stats ? (
          <ErrorState message="Couldn't load your stats. Nothing has been lost." onRetry={() => refetch()} />
        ) : !hasData ? (
          <Card>
            <EmptyState
              icon="bar-chart-2"
              title="Your financial story starts here."
              message="Once you add some income and expenses, trends appear here."
            />
          </Card>
        ) : (
          <>
            <Stagger index={1}>
              <Card style={styles.card}>
                <View style={styles.titleRow}>
                  <Text variant="titleMedium" accessibilityRole="header">
                    Cash flow
                  </Text>
                  <View style={styles.legend}>
                    <View style={[styles.key, { backgroundColor: theme.colors.chartIncome }]} />
                    <Text variant="caption" color="textSecondary">
                      In
                    </Text>
                    <View style={[styles.key, { backgroundColor: theme.colors.chartExpense }]} />
                    <Text variant="caption" color="textSecondary">
                      Out
                    </Text>
                  </View>
                </View>

                {month ? (
                  <View style={styles.readout}>
                    <Text variant="labelLarge">{formatMonthLabel(month.month)}</Text>
                    <View style={styles.readoutRow}>
                      <View style={styles.readoutCell}>
                        <Text variant="caption" color="textSecondary">
                          Money in
                        </Text>
                        <MoneyText variant="titleMedium" amountMinor={month.income} currency={currency} />
                      </View>
                      <View style={styles.readoutCell}>
                        <Text variant="caption" color="textSecondary">
                          Money out
                        </Text>
                        <MoneyText variant="titleMedium" amountMinor={month.expense} currency={currency} />
                      </View>
                      <View style={styles.readoutCell}>
                        <Text variant="caption" color="textSecondary">
                          Difference
                        </Text>
                        <MoneyText variant="titleMedium" amountMinor={month.net} currency={currency} sign="always" />
                      </View>
                    </View>
                  </View>
                ) : null}

                <GroupedBarChart
                  groups={months.map((flow) => ({ label: flow.label, values: [flow.income, flow.expense] }))}
                  colors={[theme.colors.chartIncome, theme.colors.chartExpense]}
                  selectedIndex={index}
                  onSelectIndex={setSelected}
                  accessibilityLabel={
                    hidden
                      ? 'Money in and out for the last six months, amounts hidden'
                      : `Money in and out: ${months
                          .map((flow) => `${flow.label} in ${formatMoney(flow.income, currency)}, out ${formatMoney(flow.expense, currency)}`)
                          .join('; ')}`
                  }
                />
                <Text variant="caption" color="textTertiary">
                  Tap a month to see its numbers. {formatMonthLabel(stats.monthKey).split(' ')[0]} is still in progress.
                </Text>
              </Card>
            </Stagger>

            <Stagger index={2} style={styles.kpis}>
              <Kpi label="PER DAY THIS MONTH">
                <MoneyText variant="headlineMedium" amountMinor={stats.averageDailySpend} currency={currency} />
              </Kpi>
              <Kpi label="MONTHLY AVERAGE">
                {stats.averageMonthlySpend === null ? (
                  <Text variant="bodySmall" color="textTertiary">
                    After your first full month
                  </Text>
                ) : (
                  <MoneyText variant="headlineMedium" amountMinor={stats.averageMonthlySpend} currency={currency} />
                )}
              </Kpi>
              <Kpi label="BIGGEST EXPENSE">
                {stats.largestExpense ? (
                  <>
                    <MoneyText variant="headlineMedium" amountMinor={stats.largestExpense.amountMinor} currency={currency} />
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {transactionTitle(stats.largestExpense)}
                    </Text>
                  </>
                ) : (
                  <Text variant="bodySmall" color="textTertiary">
                    None this month
                  </Text>
                )}
              </Kpi>
              <Kpi label="TOP CATEGORY">
                {stats.topCategory ? (
                  <>
                    <Text variant="titleMedium" numberOfLines={1}>
                      {stats.topCategory.emoji} {stats.topCategory.name}
                    </Text>
                    <MoneyText variant="caption" color="textSecondary" amountMinor={stats.topCategory.totalMinor} currency={currency} />
                  </>
                ) : (
                  <Text variant="bodySmall" color="textTertiary">
                    None this month
                  </Text>
                )}
              </Kpi>
            </Stagger>

            {stats.changes.length > 0 ? (
              <Stagger index={3}>
                <Card style={styles.card}>
                  <View>
                    <Text variant="titleMedium" accessibilityRole="header">
                      What changed
                    </Text>
                    <Text variant="caption" color="textTertiary">
                      This month so far vs the same days last month
                    </Text>
                  </View>
                  {stats.changes.map((change, changeIndex) => {
                    const up = change.delta !== null && change.delta > 0;
                    return (
                      <Fragment key={change.categoryId ?? 'none'}>
                        {changeIndex > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
                        <View style={styles.change}>
                          <CategoryGlyph emoji={change.emoji} color={change.color} size={34} />
                          <View style={styles.flex}>
                            <Text variant="labelLarge">{change.name}</Text>
                            <MoneyText variant="caption" color="textSecondary" amountMinor={change.currentMinor} currency={currency} />
                          </View>
                          <View style={styles.delta}>
                            {change.delta === null ? (
                              <Text variant="labelMedium" color="textTertiary">
                                New
                              </Text>
                            ) : Math.abs(change.delta) < 1 ? (
                              <Text variant="labelMedium" color="textTertiary">
                                Same
                              </Text>
                            ) : (
                              <>
                                <Icon name={up ? 'arrow-up' : 'arrow-down'} size={12} color={theme.colors.textSecondary} />
                                <Text variant="labelMedium" color="textSecondary">
                                  {Math.abs(Math.round(change.delta))}%
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                      </Fragment>
                    );
                  })}
                </Card>
              </Stagger>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    gap: 4,
  },
  section: {
    gap: 12,
  },
  card: {
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  key: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginLeft: 4,
  },
  readout: {
    gap: 6,
  },
  readoutRow: {
    flexDirection: 'row',
    gap: 10,
  },
  readoutCell: {
    flex: 1,
    gap: 2,
  },
  kpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpi: {
    width: '47%',
    flexGrow: 1,
    gap: 4,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
});
