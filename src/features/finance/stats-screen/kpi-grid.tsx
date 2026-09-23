import { StyleSheet, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { transactionTitle } from '@/components/finance/transaction-row';
import { Card, Text } from '@/components/ui';
import { formatDayLabel } from '@/domain/finance/month';

import type { FinanceStats, FlowBar } from '../stats';

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

function Empty({ children }: { children: string }) {
  return (
    <Text variant="bodySmall" color="textTertiary">
      {children}
    </Text>
  );
}

function MonthKpi({
  label,
  flow,
  amount,
  currency,
  signed = false,
}: {
  label: string;
  flow: FlowBar | null;
  amount: number;
  currency: string;
  signed?: boolean;
}) {
  return (
    <Kpi label={label}>
      {flow ? (
        <>
          <Text variant="titleMedium" numberOfLines={1}>
            {flow.title}
          </Text>
          <MoneyText
            variant="caption"
            color="textSecondary"
            amountMinor={amount}
            currency={currency}
            sign={signed ? 'always' : 'auto'}
          />
        </>
      ) : (
        <Empty>Not enough history yet</Empty>
      )}
    </Kpi>
  );
}

/** The period's numbers at a glance, two to a row. */
export function KpiGrid({ stats }: { stats: FinanceStats }) {
  const { currency, period, range } = stats;
  const none = period.scope === 'all' ? 'Nothing yet' : range.inProgress ? 'None so far' : 'None';

  return (
    <View style={styles.grid}>
      <Kpi label="PER DAY">
        <MoneyText variant="headlineMedium" amountMinor={stats.averageDailySpend} currency={currency} />
        <Text variant="caption" color="textSecondary">
          Average over {stats.dayCount} {stats.dayCount === 1 ? 'day' : 'days'}
        </Text>
      </Kpi>
      <Kpi label="PER MONTH">
        {stats.averageMonthlySpend === null ? (
          <Empty>After your first full month</Empty>
        ) : (
          <>
            <MoneyText variant="headlineMedium" amountMinor={stats.averageMonthlySpend} currency={currency} />
            <Text variant="caption" color="textSecondary">
              {period.scope === 'month' ? 'Average of the months before' : 'Average of full months'}
            </Text>
          </>
        )}
      </Kpi>
      <Kpi label="BIGGEST EXPENSE">
        {stats.largestExpense ? (
          <>
            <MoneyText variant="headlineMedium" amountMinor={stats.largestExpense.amountMinor} currency={currency} />
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {transactionTitle(stats.largestExpense)} · {formatDayLabel(stats.largestExpense.occurredOn)}
            </Text>
          </>
        ) : (
          <Empty>{none}</Empty>
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
          <Empty>{none}</Empty>
        )}
      </Kpi>
      <Kpi label="NO-SPEND DAYS">
        <Text variant="headlineMedium">{stats.noSpendDays}</Text>
        <Text variant="caption" color="textSecondary">
          of {stats.dayCount} {stats.dayCount === 1 ? 'day' : 'days'}
        </Text>
      </Kpi>
      <Kpi label="TRANSACTIONS">
        <Text variant="headlineMedium">{stats.transactionCount}</Text>
        <Text variant="caption" color="textSecondary">
          {stats.transactionCount > 0
            ? `About ${Math.max(1, Math.round(stats.transactionCount / Math.max(1, stats.dayCount / 7)))} a week`
            : 'Recorded'}
        </Text>
      </Kpi>
      {period.scope !== 'month' ? (
        <>
          <MonthKpi
            label="COSTLIEST MONTH"
            flow={stats.costliestMonth}
            amount={stats.costliestMonth?.expense ?? 0}
            currency={currency}
          />
          <MonthKpi
            label="BEST MONTH"
            flow={stats.bestMonth}
            amount={stats.bestMonth?.net ?? 0}
            currency={currency}
            signed
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpi: {
    width: '47%',
    flexGrow: 1,
    gap: 4,
  },
});
