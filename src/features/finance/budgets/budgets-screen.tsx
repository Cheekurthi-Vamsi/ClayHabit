import { Fragment, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BudgetMeter } from '@/components/finance/budget-meter';
import { CategoryGlyph } from '@/components/finance/category-glyph';
import { MoneyText } from '@/components/finance/money-text';
import { FinanceScreenHeader } from '@/components/finance/screen-header';
import { Button, Card, ErrorState, GradientCard, IconButton, Skeleton, Text } from '@/components/ui';
import { budgetMessage } from '@/domain/finance/budget';
import type { MonthKey } from '@/domain/finance/entities';
import { addMonths, formatMonthLabel, monthKeyOf } from '@/domain/finance/month';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useBudgetPicture, useCurrency } from '../hooks';

/** Every budget for a month, what's been spent against it, and spending with no budget yet. */
export function BudgetsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentMonth = monthKeyOf(todayIso());
  const [month, setMonth] = useState<MonthKey>(currentMonth);
  const currency = useCurrency();
  const { data: picture, isLoading, isError, refetch } = useBudgetPicture(month);
  const isCurrent = month === currentMonth;

  const edit = (categoryId: string | null) =>
    router.push({
      pathname: '/modal/budget',
      params: { month, ...(categoryId ? { categoryId } : { scope: 'overall' }) },
    });

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <FinanceScreenHeader title="Budgets" subtitle="Monthly limits you set for yourself." />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.monthRow}>
          <IconButton
            name="chevron-left"
            variant="muted"
            size={36}
            accessibilityLabel="Previous month"
            onPress={() => setMonth((key) => addMonths(key, -1))}
          />
          <Text variant="titleLarge" style={styles.monthLabel} accessibilityLiveRegion="polite">
            {formatMonthLabel(month)}
          </Text>
          <IconButton
            name="chevron-right"
            variant="muted"
            size={36}
            accessibilityLabel="Next month"
            disabled={isCurrent}
            onPress={() => setMonth((key) => addMonths(key, 1))}
          />
        </View>

        {isLoading && !picture ? (
          <View style={styles.section}>
            <Skeleton height={130} radius={theme.radii.lg} />
            <Skeleton height={200} radius={theme.radii.lg} />
          </View>
        ) : isError || !picture ? (
          <ErrorState message="Couldn't load budgets. Nothing has been lost." onRetry={() => refetch()} />
        ) : (
          <>
            {picture.overall ? (
              <Card style={styles.card}>
                <BudgetMeter line={picture.overall} currency={currency} onPress={isCurrent ? () => edit(null) : undefined} />
                <Text variant="bodySmall" color="textSecondary">
                  {budgetMessage('Overall', picture.overall.usage)}
                </Text>
              </Card>
            ) : isCurrent ? (
              <GradientCard gradient={theme.gradients.finance} orbs="glow" contentStyle={styles.cta}>
                <Text variant="titleLarge" style={styles.white}>
                  Set a monthly budget to understand where your money is going.
                </Text>
                <Text variant="bodySmall" style={styles.whiteMuted}>
                  Start with one limit for everything you spend in a month. You can add categories after.
                </Text>
                <Button label="Set a monthly limit" icon="plus" variant="glass" size="sm" onPress={() => edit(null)} />
              </GradientCard>
            ) : null}

            <View style={styles.section}>
              <Text variant="labelLarge" color="textSecondary">
                CATEGORY BUDGETS
              </Text>
              {picture.lines.length === 0 ? (
                <Card>
                  <Text variant="bodyMedium" color="textSecondary">
                    {isCurrent ? 'No category budgets yet.' : `No category budgets in ${formatMonthLabel(month)}.`}
                  </Text>
                </Card>
              ) : (
                <Card style={styles.list}>
                  {picture.lines.map((line, index) => (
                    <Fragment key={line.scope}>
                      {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
                      <View style={styles.item}>
                        <BudgetMeter
                          line={line}
                          currency={currency}
                          onPress={isCurrent ? () => edit(line.categoryId) : undefined}
                        />
                      </View>
                    </Fragment>
                  ))}
                </Card>
              )}
              {isCurrent ? (
                <Button
                  label="Add a category budget"
                  icon="plus"
                  variant="outline"
                  onPress={() => router.push({ pathname: '/modal/budget', params: { month } })}
                />
              ) : null}
            </View>

            {picture.unbudgeted.length > 0 ? (
              <View style={styles.section}>
                <Text variant="labelLarge" color="textSecondary">
                  SPENDING WITHOUT A BUDGET
                </Text>
                <Card style={styles.list}>
                  {picture.unbudgeted.map((item, index) => (
                    <Fragment key={item.id}>
                      {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
                      <Pressable
                        onPress={isCurrent ? () => edit(item.id) : undefined}
                        disabled={!isCurrent}
                        accessibilityRole={isCurrent ? 'button' : undefined}
                        accessibilityHint={isCurrent ? `Set a budget for ${item.name}` : undefined}
                        style={styles.unbudgeted}
                      >
                        <CategoryGlyph emoji={item.emoji} color={item.color} size={34} />
                        <Text variant="labelLarge" style={styles.flex}>
                          {item.name}
                        </Text>
                        <MoneyText variant="labelLarge" amountMinor={item.spentMinor} currency={currency} />
                        {isCurrent ? (
                          <Text variant="labelMedium" color="financeText">
                            Set
                          </Text>
                        ) : null}
                      </Pressable>
                    </Fragment>
                  ))}
                </Card>
              </View>
            ) : null}

            <Text variant="caption" color="textTertiary" style={styles.fineprint}>
              Changing a budget applies from the current month on. Earlier months keep the limits they had.
            </Text>
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
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  card: {
    gap: 12,
  },
  cta: {
    gap: 10,
    alignItems: 'flex-start',
  },
  list: {
    paddingVertical: 4,
  },
  item: {
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  unbudgeted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  fineprint: {
    textAlign: 'center',
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.9)',
  },
});
