import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDockSpace } from '@/components/navigation/floating-dock';
import { Card, EmptyState, ErrorState, Skeleton, Stagger, Text } from '@/components/ui';
import { currentPeriod, periodLabel, yearOf, type StatsPeriod } from '@/domain/finance/period';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useFinanceStats } from '../hooks';
import { BreakdownCard, CategoryChangesCard, SpendingPatternsCard } from './breakdown-cards';
import { CashFlowHistoryCard } from './cash-flow-history-card';
import { KpiGrid } from './kpi-grid';
import { PeriodPicker } from './period-picker';
import { SpendingCalendarCard } from './spending-calendar-card';
import { SummaryCard } from './summary-card';
import { BalanceTrendCard, SpendingPaceCard } from './trend-cards';
import { YearTableCard } from './year-table-card';

/**
 * Money over time — one month, one year, or every year on record — with the
 * cash flow, balance, pace, calendar, categories and habits behind it. One
 * period picker at the top scopes everything below it.
 */
export function FinanceStatsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const [period, setPeriod] = useState<StatsPeriod>(() => currentPeriod('month', todayIso()));
  const { data: stats, isLoading, isError, isPlaceholderData, refetch } = useFinanceStats(period);

  const periodSubtitle =
    stats?.period.scope === 'all'
      ? 'every month on record'
      : stats?.period.scope === 'year'
        ? 'this year'
        : 'this month';

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
            Where your money has been going — month by month, and year by year.
          </Text>
        </Stagger>

        {stats ? (
          <Stagger index={1}>
            <PeriodPicker period={stats.period} bounds={stats.bounds} today={stats.today} onChange={setPeriod} />
          </Stagger>
        ) : null}

        {isLoading && !stats ? (
          <View style={styles.section}>
            <Skeleton height={140} radius={theme.radii.lg} />
            <Skeleton height={300} radius={theme.radii.lg} />
            <Skeleton height={180} radius={theme.radii.lg} />
          </View>
        ) : isError || !stats ? (
          <ErrorState message="Couldn't load your stats. Nothing has been lost." onRetry={() => refetch()} />
        ) : !stats.hasAnyRecords ? (
          <Card>
            <EmptyState
              icon="bar-chart-2"
              title="Your financial story starts here."
              message="Once you add some income and expenses, trends appear here — month by month and year by year."
            />
          </Card>
        ) : !stats.hasData ? (
          <Card>
            <EmptyState
              icon="calendar"
              title={`Nothing recorded in ${periodLabel(stats.period)}`}
              message="Step to another period with the arrows, or switch to All time."
            />
          </Card>
        ) : (
          // While a new period loads, the last one stays on screen, dimmed, instead of a skeleton flash.
          <View style={[styles.section, { opacity: isPlaceholderData ? 0.55 : 1 }]}>
            <Stagger index={2}>
              <SummaryCard stats={stats} />
            </Stagger>
            <Stagger index={3}>
              <CashFlowHistoryCard stats={stats} />
            </Stagger>
            <Stagger index={4}>
              <BalanceTrendCard stats={stats} />
            </Stagger>
            {stats.pace ? (
              <Stagger index={5}>
                <SpendingPaceCard pace={stats.pace} stats={stats} />
              </Stagger>
            ) : null}
            {stats.dailySpend ? (
              <Stagger index={6}>
                <SpendingCalendarCard stats={stats} dailySpend={stats.dailySpend} />
              </Stagger>
            ) : null}
            <Stagger index={7}>
              <KpiGrid stats={stats} />
            </Stagger>
            <Stagger index={8}>
              <BreakdownCard
                title="Where it went"
                subtitle={`Spending by category, ${periodSubtitle}`}
                breakdown={stats.categories}
                currency={stats.currency}
              />
            </Stagger>
            <Stagger index={9}>
              <CategoryChangesCard stats={stats} />
            </Stagger>
            <Stagger index={10}>
              <BreakdownCard
                title="Where it came from"
                subtitle={`Income by category, ${periodSubtitle}`}
                breakdown={stats.incomeSources}
                currency={stats.currency}
              />
            </Stagger>
            <Stagger index={11}>
              <SpendingPatternsCard stats={stats} />
            </Stagger>
            {stats.years.length > 0 ? (
              <Stagger index={12}>
                <YearTableCard
                  years={stats.years}
                  currency={stats.currency}
                  currentYear={yearOf(stats.today)}
                  onOpenYear={(year) => setPeriod({ scope: 'year', year })}
                />
              </Stagger>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    gap: 18,
  },
});
