import { Fragment } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BudgetMeter } from '@/components/finance/budget-meter';
import { SavingsPlanCard } from '@/components/finance/savings-plan-card';
import { Card, Icon, SectionHeader, Text } from '@/components/ui';
import type { BudgetPicture } from '@/domain/finance/budget';
import type { SavingsPlanWithProgress } from '@/domain/finance/entities';
import { useAppTheme } from '@/theme';

const MAX_BUDGETS = 3;

function Prompt({ icon, text, action, onPress }: { icon: 'sliders' | 'target'; text: string; action: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={action}>
      <View style={styles.prompt}>
        <View style={[styles.promptIcon, { backgroundColor: theme.colors.financeMuted }]}>
          <Icon name={icon} size={18} color={theme.colors.financeText} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{text}</Text>
          <Text variant="labelLarge" color="financeText">
            {action} →
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** The budgets closest to their limits, or a gentle nudge to set one. */
export function BudgetsPreview({ budgets, currency }: { budgets: BudgetPicture; currency: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const lines = [...(budgets.overall ? [budgets.overall] : []), ...budgets.lines].slice(0, MAX_BUDGETS);

  return (
    <View style={styles.section}>
      <SectionHeader title="Budgets" onAction={() => router.push('/fm/budgets')} />
      {lines.length === 0 ? (
        <Prompt
          icon="sliders"
          text="Set a monthly budget to understand where your money is going."
          action="Set a budget"
          onPress={() => router.push('/fm/budgets')}
        />
      ) : (
        <Card style={styles.list}>
          {lines.map((line, index) => (
            <Fragment key={line.scope}>
              {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
              <Pressable onPress={() => router.push('/fm/budgets')} accessibilityRole="button" style={styles.item}>
                <BudgetMeter line={line} currency={currency} />
              </Pressable>
            </Fragment>
          ))}
        </Card>
      )}
    </View>
  );
}

/** The most important unfinished savings plan, or an invitation to start one. */
export function SavingsPreview({ plans, currency }: { plans: readonly SavingsPlanWithProgress[]; currency: string }) {
  const router = useRouter();
  const plan = plans.find((item) => !item.completedAt) ?? plans[0];

  return (
    <View style={styles.section}>
      <SectionHeader title="Saving plan" onAction={() => router.navigate('/finance/goals')} />
      {plan ? (
        <SavingsPlanCard plan={plan} currency={currency} onPress={() => router.push(`/fm/savings/${plan.id}`)} />
      ) : (
        <Prompt
          icon="target"
          text="Give your money a purpose. Create your first savings goal."
          action="Create a goal"
          onPress={() => router.push('/modal/savings-plan')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
});
