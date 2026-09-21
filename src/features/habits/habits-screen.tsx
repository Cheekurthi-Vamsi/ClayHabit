import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, ErrorState, IconButton, ProgressBar, Skeleton, Text } from '@/components/ui';
import { isCompletedOn, isScheduledOn } from '@/domain/services/habit-engine';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { HabitCard } from './habit-card';
import { useHabits } from './hooks';

export function HabitsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const { data: habits, isLoading, isError, refetch } = useHabits();

  const today = todayIso();
  const scheduled = (habits ?? []).filter((habit) => isScheduledOn(habit.daysOfWeek, today));
  const done = scheduled.filter((habit) => isCompletedOn(habit.logs, habit.targetPerDay, today)).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={styles.titleRow}>
          <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
          <Text variant="displayMedium">Habits</Text>
        </View>
        <IconButton
          name="plus"
          variant="filled"
          accessibilityLabel="New habit"
          onPress={() => router.push('/modal/new-habit')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={190} radius={theme.radii.lg} />
            <Skeleton height={190} radius={theme.radii.lg} />
          </View>
        ) : isError ? (
          <ErrorState message="Couldn't load your habits." onRetry={() => refetch()} />
        ) : (habits?.length ?? 0) === 0 ? (
          <View style={styles.empty}>
            <EmptyState
              icon="repeat"
              title="Build your first habit"
              message="Track anything you want to do regularly — each habit gets its own year-long heatmap."
            />
            <Button label="Create a habit" icon="plus" onPress={() => router.push('/modal/new-habit')} />
          </View>
        ) : (
          <>
            {scheduled.length > 0 ? (
              <View style={styles.summary}>
                <View style={styles.summaryText}>
                  <Text variant="titleMedium">
                    {done} of {scheduled.length} done today
                  </Text>
                  <Text variant="bodySmall" color="textSecondary">
                    {done === scheduled.length ? 'All habits complete — nice.' : 'Keep the chain going.'}
                  </Text>
                </View>
                <ProgressBar progress={done / scheduled.length} gradient={theme.gradients.pinkPurple} height={8} />
              </View>
            ) : null}

            {habits!.map((habit, index) => (
              <Animated.View
                key={habit.id}
                entering={reduceMotion ? undefined : FadeInDown.delay(index * 60).springify().damping(18)}
              >
                <HabitCard habit={habit} onPress={() => router.push(`/habit/${habit.id}`)} />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -10,
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
  },
  summary: {
    gap: 10,
    marginBottom: 4,
  },
  summaryText: {
    gap: 2,
  },
});
