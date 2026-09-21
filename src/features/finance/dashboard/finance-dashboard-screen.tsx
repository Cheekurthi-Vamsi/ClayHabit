import { Fragment, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpendingBreakdown } from '@/components/finance/spending-breakdown';
import { TransactionRow } from '@/components/finance/transaction-row';
import { EnvironmentSwitcher } from '@/components/navigation/environment-switcher';
import { useDockSpace } from '@/components/navigation/floating-dock';
import { Button, Card, EmptyState, ErrorState, SectionHeader, Skeleton, Stagger, Text } from '@/components/ui';
import { monthKeyOf } from '@/domain/finance/month';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useFinanceOverview } from '../hooks';
import { BalanceHeroCard } from './balance-hero-card';
import { CashFlowCard } from './cash-flow-card';
import { FinanceHeader } from './finance-header';
import { MonthTiles } from './month-tiles';
import { WelcomeCard } from './welcome-card';

export function FinanceDashboardScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: overview, isLoading, isError, refetch } = useFinanceOverview();

  const monthKey = overview?.monthKey ?? monthKeyOf(todayIso());
  const currency = overview?.account.currency ?? 'INR';

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['finance'] });
    setRefreshing(false);
  };

  const openTransaction = (id: string) => router.push({ pathname: '/modal/transaction', params: { id } });

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + theme.spacing.md, paddingBottom: dockSpace },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.finance}
            colors={[theme.colors.finance]}
          />
        }
      >
        <Stagger index={0} style={styles.top}>
          <EnvironmentSwitcher current="finance" />
          <FinanceHeader title="Financial Overview" monthKey={monthKey} />
        </Stagger>

        {isLoading && !overview ? (
          <View style={styles.section}>
            <Skeleton height={190} radius={theme.radii.lg} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Skeleton height={130} radius={theme.radii.lg} />
              </View>
              <View style={styles.flex}>
                <Skeleton height={130} radius={theme.radii.lg} />
              </View>
            </View>
            <Skeleton height={260} radius={theme.radii.lg} />
          </View>
        ) : isError || !overview ? (
          <ErrorState
            message="Couldn't load your finances. Nothing has been lost."
            onRetry={() => refetch()}
          />
        ) : overview.isEmpty ? (
          <Stagger index={1}>
            <WelcomeCard />
          </Stagger>
        ) : (
          <>
            <Stagger index={1}>
              <BalanceHeroCard
                availableMinor={overview.available}
                summary={overview.summary}
                monthKey={overview.monthKey}
                currency={currency}
              />
            </Stagger>

            <Stagger index={2}>
              <MonthTiles
                summary={overview.summary}
                spentSamePointLastMonth={overview.spentSamePointLastMonth}
                currency={currency}
              />
            </Stagger>

            <Stagger index={3}>
              <CashFlowCard overview={overview} />
            </Stagger>

            <Stagger index={4} style={styles.section}>
              <SectionHeader title="Where it went" onAction={() => router.navigate('/finance/money')} />
              <Card>
                {overview.categories.items.length === 0 ? (
                  <EmptyState
                    icon="pie-chart"
                    title="No spending yet this month"
                    message="Expenses you add show up here by category."
                  />
                ) : (
                  <SpendingBreakdown breakdown={overview.categories} currency={currency} />
                )}
              </Card>
            </Stagger>

            <Stagger index={5} style={styles.section}>
              <SectionHeader title="Recent" onAction={() => router.navigate('/finance/money')} />
              {overview.recent.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text variant="bodyMedium" color="textSecondary" style={styles.center}>
                    Nothing recorded yet. Your starting balance is set.
                  </Text>
                  <Button label="Add expense" icon="plus" size="sm" onPress={() => router.push('/modal/transaction')} />
                </Card>
              ) : (
                <Card style={styles.listCard}>
                  <View style={[styles.listInner, { borderRadius: theme.radii.lg }]}>
                    {overview.recent.map((transaction, index) => (
                      <Fragment key={transaction.id}>
                        {index > 0 ? (
                          <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                        ) : null}
                        <TransactionRow
                          transaction={transaction}
                          currency={currency}
                          showDate
                          onPress={() => openTransaction(transaction.id)}
                        />
                      </Fragment>
                    ))}
                  </View>
                </Card>
              )}
            </Stagger>
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
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  top: {
    gap: 18,
  },
  section: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  listCard: {
    padding: 0,
  },
  listInner: {
    overflow: 'hidden',
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 12,
  },
  center: {
    textAlign: 'center',
  },
});
