import { Fragment } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoneyText } from '@/components/finance/money-text';
import { FinanceScreenHeader } from '@/components/finance/screen-header';
import { Button, Card, EmptyState, GradientCard, Icon, IconButton, ProgressRing, Skeleton, Text } from '@/components/ui';
import { formatMoney } from '@/domain/finance/currency';
import { PRIORITY_LABELS, type SavingsPlanWithProgress } from '@/domain/finance/entities';
import { formatDayLabel, formatMonthLabel, monthKeyOf } from '@/domain/finance/month';
import { projectSavings } from '@/domain/finance/savings';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useCurrency, useSavingsEntries, useSavingsMutations, useSavingsPlan } from '../hooks';

function monthYear(isoDate: string): string {
  return formatMonthLabel(monthKeyOf(isoDate));
}

/** Plain-language projection lines. Estimates from the person's own entries — never promises. */
function projectionLines(plan: SavingsPlanWithProgress, currency: string, hidden: boolean): string[] {
  const money = (minor: number) => (hidden ? 'a set amount' : formatMoney(minor, currency));
  const rate = plan.monthlyContributionMinor ?? (plan.recentMonthlyMinor > 0 ? plan.recentMonthlyMinor : null);
  const projection = projectSavings({
    targetMinor: plan.targetMinor,
    savedMinor: plan.savedMinor,
    targetDate: plan.targetDate,
    today: todayIso(),
    monthlyContributionMinor: rate,
  });

  if (projection.isComplete) return ['You’ve reached this goal. Anything more you add is extra cushion.'];

  const lines: string[] = [];
  if (plan.targetDate && projection.requiredMonthlyMinor !== null) {
    lines.push(
      projection.isPastTarget
        ? `The target date has passed. ${money(projection.remainingMinor)} is still to go — you can set a new date any time.`
        : `To reach it by ${monthYear(plan.targetDate)}, you'd need about ${money(projection.requiredMonthlyMinor)} a month (${money(projection.requiredWeeklyMinor ?? 0)} a week).`,
    );
  }
  if (rate && projection.projectedCompletion) {
    const source = plan.monthlyContributionMinor ? 'planned' : 'current';
    lines.push(
      `At your ${source} contribution rate of about ${money(rate)} a month, you'd get there around ${monthYear(projection.projectedCompletion)}.`,
    );
  } else if (!plan.targetDate) {
    lines.push('Add money or set a target date to see how long it could take.');
  }
  return lines;
}

export function PlanDetailScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currency = useCurrency();
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const { data: plan, isLoading } = useSavingsPlan(id);
  const { data: entries } = useSavingsEntries(id);
  const { remove, removeEntry } = useSavingsMutations();

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <FinanceScreenHeader title="Savings plan" />
        <View style={styles.content}>
          <Skeleton height={200} radius={theme.radii.lg} />
        </View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <FinanceScreenHeader title="Savings plan" />
        <EmptyState icon="inbox" title="Not found" message="This savings plan no longer exists." />
      </View>
    );
  }

  const progress = plan.targetMinor > 0 ? Math.min(1, plan.savedMinor / plan.targetMinor) : 0;
  const remaining = Math.max(0, plan.targetMinor - plan.savedMinor);

  const openEntry = (kind: 'deposit' | 'withdraw') =>
    router.push({ pathname: '/modal/savings-entry', params: { planId: plan.id, kind } });

  const confirmRemove = () =>
    Alert.alert(
      plan.entryCount > 0 ? 'Archive this plan?' : 'Delete this plan?',
      plan.entryCount > 0
        ? 'Its history stays in your records. Money still in it keeps counting as set aside until you withdraw it.'
        : 'It has no money in it yet, so it will be removed completely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: plan.entryCount > 0 ? 'Archive' : 'Delete',
          style: 'destructive',
          onPress: () => remove.mutate(plan.id, { onSuccess: () => router.back() }),
        },
      ],
    );

  const confirmRemoveEntry = (transactionId: string, label: string) =>
    Alert.alert('Remove this entry?', `${label} will be taken out of this plan's history and your balance.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeEntry.mutate({ planId: plan.id, transactionId }),
      },
    ]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <FinanceScreenHeader
        title={`${plan.emoji} ${plan.name}`}
        subtitle={plan.completedAt ? 'Goal reached' : `${PRIORITY_LABELS[plan.priority]} priority`}
        right={
          <IconButton
            name="edit-2"
            variant="muted"
            accessibilityLabel="Edit plan"
            onPress={() => router.push({ pathname: '/modal/savings-plan', params: { id: plan.id } })}
          />
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <GradientCard gradient={theme.gradients.finance} orbs="glow" contentStyle={styles.hero}>
          <ProgressRing progress={progress} size={112} strokeWidth={11} color="#FFFFFF" trackColor="rgba(255,255,255,0.28)">
            <Text variant="headlineMedium" style={styles.white}>
              {Math.round(progress * 100)}%
            </Text>
          </ProgressRing>
          <View style={styles.heroText}>
            <Text variant="labelMedium" style={styles.whiteMuted}>
              SAVED
            </Text>
            <MoneyText amountMinor={plan.savedMinor} currency={currency} variant="headlineLarge" style={styles.white} />
            <View style={styles.inline}>
              <Text variant="caption" style={styles.whiteMuted}>
                {'of '}
              </Text>
              <MoneyText amountMinor={plan.targetMinor} currency={currency} variant="caption" style={styles.whiteMuted} />
            </View>
            {remaining > 0 ? (
              <View style={styles.inline}>
                <MoneyText amountMinor={remaining} currency={currency} variant="labelLarge" style={styles.white} />
                <Text variant="caption" style={styles.whiteMuted}>
                  {' to go'}
                </Text>
              </View>
            ) : null}
          </View>
        </GradientCard>

        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="Add money" icon="plus" fullWidth gradient={theme.gradients.finance} onPress={() => openEntry('deposit')} />
          </View>
          <View style={styles.flex}>
            <Button
              label="Withdraw"
              icon="minus"
              variant="outline"
              fullWidth
              disabled={plan.savedMinor <= 0}
              onPress={() => openEntry('withdraw')}
            />
          </View>
        </View>

        <Card style={styles.card}>
          <Text variant="titleMedium" accessibilityRole="header">
            Projection
          </Text>
          {projectionLines(plan, currency, hidden).map((line) => (
            <Text key={line} variant="bodyMedium" color="textSecondary">
              {line}
            </Text>
          ))}
          <View style={[styles.note, { borderTopColor: theme.colors.border }]}>
            <Icon name="info" size={13} color={theme.colors.textTertiary} />
            <Text variant="caption" color="textTertiary" style={styles.flex}>
              Estimates use only your own entries. They aren&apos;t guarantees, and nothing here moves money for you.
            </Text>
          </View>
        </Card>

        {plan.notes ? (
          <Card style={styles.card}>
            <Text variant="labelMedium" color="textSecondary">
              NOTES
            </Text>
            <Text variant="bodyMedium">{plan.notes}</Text>
          </Card>
        ) : null}

        <View style={styles.section}>
          <Text variant="labelLarge" color="textSecondary">
            HISTORY
          </Text>
          {!entries || entries.length === 0 ? (
            <Card>
              <Text variant="bodyMedium" color="textSecondary">
                Nothing added yet. Money you add shows up here.
              </Text>
            </Card>
          ) : (
            <Card style={styles.list}>
              {entries.map((entry, index) => {
                const deposit = entry.type === 'saving';
                const label = `${deposit ? 'Added' : 'Withdrew'} ${hidden ? '' : formatMoney(entry.amountMinor, currency)}`.trim();
                return (
                  <Fragment key={entry.id}>
                    {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
                    <Pressable
                      onLongPress={() => confirmRemoveEntry(entry.id, label)}
                      accessibilityHint="Long press to remove this entry"
                      style={styles.entry}
                    >
                      <View style={[styles.entryIcon, { backgroundColor: deposit ? theme.colors.financeMuted : theme.colors.surfaceMuted }]}>
                        <Icon
                          name={deposit ? 'arrow-down' : 'arrow-up'}
                          size={16}
                          color={deposit ? theme.colors.financeText : theme.colors.textSecondary}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Text variant="labelLarge">{deposit ? 'Added' : 'Withdrew'}</Text>
                        <Text variant="caption" color="textTertiary">
                          {[formatDayLabel(entry.occurredOn), entry.note].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <MoneyText
                        variant="titleMedium"
                        amountMinor={deposit ? entry.amountMinor : -entry.amountMinor}
                        currency={currency}
                        sign="always"
                        color={deposit ? 'financeText' : 'textPrimary'}
                      />
                    </Pressable>
                  </Fragment>
                );
              })}
            </Card>
          )}
        </View>

        <Button
          label={plan.entryCount > 0 ? 'Archive plan' : 'Delete plan'}
          icon={plan.entryCount > 0 ? 'archive' : 'trash-2'}
          variant="ghost"
          onPress={confirmRemove}
        />
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
    gap: 16,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 22,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    gap: 8,
  },
  note: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 2,
  },
  section: {
    gap: 10,
  },
  list: {
    paddingVertical: 4,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.9)',
  },
});
