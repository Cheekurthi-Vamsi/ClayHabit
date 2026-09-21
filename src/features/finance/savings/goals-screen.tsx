import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryGlyph } from '@/components/finance/category-glyph';
import { MoneyText } from '@/components/finance/money-text';
import { SavingsPlanCard } from '@/components/finance/savings-plan-card';
import { useDockSpace } from '@/components/navigation/floating-dock';
import { Button, Card, ErrorState, GradientCard, Skeleton, Stagger, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useCurrency, useSavingsPlans } from '../hooks';
import { PLAN_TEMPLATES } from './templates';

/** Savings plans: what the money is for. */
export function GoalsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const currency = useCurrency();
  const { data: plans, isLoading, isError, refetch } = useSavingsPlans();

  const total = (plans ?? []).reduce((sum, plan) => sum + plan.savedMinor, 0);
  const active = (plans ?? []).filter((plan) => !plan.completedAt);
  const reached = (plans ?? []).filter((plan) => plan.completedAt);

  const newPlan = (template?: string) =>
    router.push({ pathname: '/modal/savings-plan', params: template ? { template } : {} });

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md, paddingBottom: dockSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <Stagger index={0} style={styles.header}>
          <Text variant="displayMedium" accessibilityRole="header">
            Goals
          </Text>
          <Text variant="bodyMedium" color="textSecondary">
            Give your money a purpose, one plan at a time.
          </Text>
        </Stagger>

        {isLoading ? (
          <View style={styles.section}>
            <Skeleton height={120} radius={theme.radii.lg} />
            <Skeleton height={130} radius={theme.radii.lg} />
          </View>
        ) : isError || !plans ? (
          <ErrorState message="Couldn't load your savings plans. Nothing has been lost." onRetry={() => refetch()} />
        ) : plans.length === 0 ? (
          <Stagger index={1} style={styles.section}>
            <GradientCard gradient={theme.gradients.finance} orbs="glow" contentStyle={styles.empty}>
              <Text variant="displayMedium" style={styles.white}>
                Give your money a purpose.
              </Text>
              <Text variant="bodyMedium" style={styles.whiteMuted}>
                Create your first savings goal. Money you put toward it is set aside from what&apos;s available to spend.
              </Text>
              <Button label="Create a savings goal" icon="plus" variant="glass" size="sm" onPress={() => newPlan()} />
            </GradientCard>
            <Text variant="labelLarge" color="textSecondary">
              OR START FROM
            </Text>
            <View style={styles.templates}>
              {PLAN_TEMPLATES.map((template) => (
                <Card key={template.key} onPress={() => newPlan(template.key)} style={styles.template} accessibilityLabel={`New ${template.name} plan`}>
                  <CategoryGlyph emoji={template.emoji} color={template.color} size={36} />
                  <Text variant="labelLarge" numberOfLines={1}>
                    {template.name}
                  </Text>
                </Card>
              ))}
            </View>
          </Stagger>
        ) : (
          <>
            <Stagger index={1}>
              <GradientCard gradient={theme.gradients.finance} orbs="drift" contentStyle={styles.summary}>
                <Text variant="labelMedium" style={styles.whiteMuted}>
                  SET ASIDE ACROSS {plans.length} {plans.length === 1 ? 'PLAN' : 'PLANS'}
                </Text>
                <MoneyText
                  amountMinor={total}
                  currency={currency}
                  countUpKey="finance.savedTotal"
                  variant="displayMedium"
                  style={styles.white}
                />
                <Text variant="caption" style={styles.whiteMuted}>
                  Kept apart from your available balance until you take it out.
                </Text>
              </GradientCard>
            </Stagger>

            <Stagger index={2} style={styles.section}>
              {active.map((plan) => (
                <SavingsPlanCard
                  key={plan.id}
                  plan={plan}
                  currency={currency}
                  onPress={() => router.push(`/fm/savings/${plan.id}`)}
                />
              ))}
              <Button label="New savings plan" icon="plus" variant="outline" onPress={() => newPlan()} />
            </Stagger>

            {reached.length > 0 ? (
              <Stagger index={3} style={styles.section}>
                <Text variant="labelLarge" color="textSecondary">
                  REACHED
                </Text>
                {reached.map((plan) => (
                  <SavingsPlanCard
                    key={plan.id}
                    plan={plan}
                    currency={currency}
                    onPress={() => router.push(`/fm/savings/${plan.id}`)}
                  />
                ))}
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
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  section: {
    gap: 12,
  },
  empty: {
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 22,
  },
  summary: {
    gap: 6,
  },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  template: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.9)',
  },
});
