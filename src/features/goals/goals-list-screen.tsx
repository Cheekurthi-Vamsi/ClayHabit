import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, IconButton, Skeleton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { GoalCard } from './goal-card';
import { useGoals } from './hooks';

export function GoalsListScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: goals, isLoading } = useGoals();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.titleRow}>
          <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
          <Text variant="displayMedium">Goals</Text>
        </View>
        <IconButton
          name="plus"
          variant="filled"
          accessibilityLabel="New goal"
          onPress={() => router.push('/modal/new-goal')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.huge }]}
      >
        {isLoading ? (
          <Skeleton height={100} radius={theme.radii.lg} />
        ) : (goals?.length ?? 0) === 0 ? (
          <EmptyState
            icon="target"
            title="No goals yet"
            message="Set a goal and link tasks to track your progress."
          />
        ) : (
          goals!.map((goal) => <GoalCard key={goal.id} goal={goal} />)
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
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -10,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
});
