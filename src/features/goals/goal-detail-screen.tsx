import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, EmptyState, IconButton, ProgressRing, Skeleton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useDeleteGoal, useGoal, useGoalTasks } from './hooks';

export function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: goal, isLoading } = useGoal(id);
  const { data: tasks } = useGoalTasks(id);
  const deleteGoal = useDeleteGoal();

  if (isLoading || !goal) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, padding: 20 }]}>
        <Skeleton height={32} radius={8} />
      </View>
    );
  }

  const total = tasks?.length ?? 0;
  const completed = tasks?.filter((task) => task.isCompleted).length ?? 0;
  const progress = total === 0 ? 0 : completed / total;

  const handleDelete = () => {
    Alert.alert('Delete goal?', 'Linked tasks will remain, just unlinked from this goal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteGoal.mutate(goal.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.huge },
      ]}
    >
      <View style={styles.headerRow}>
        <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <IconButton name="trash-2" variant="ghost" accessibilityLabel="Delete goal" onPress={handleDelete} />
      </View>

      <Text variant="displayMedium">{goal.title}</Text>
      {goal.description && (
        <Text variant="bodyLarge" color="textSecondary">
          {goal.description}
        </Text>
      )}

      <Card style={styles.progressCard}>
        <ProgressRing progress={progress} size={96} strokeWidth={10}>
          <Text variant="headlineMedium">{Math.round(progress * 100)}%</Text>
        </ProgressRing>
        <View style={{ gap: 4 }}>
          <Text variant="titleMedium">
            {completed}/{total} tasks complete
          </Text>
          {goal.deadline && (
            <Text variant="bodySmall" color="textSecondary">
              Due {goal.deadline}
            </Text>
          )}
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <Text variant="labelLarge" color="textSecondary">
          RELATED TASKS
        </Text>
        {total === 0 ? (
          <EmptyState icon="check-circle" title="No tasks linked yet" message="Link tasks to this goal from a task's detail screen." />
        ) : (
          tasks!.map((task) => (
            <Card key={task.id} onPress={() => router.push(`/task/${task.id}`)} accessibilityLabel={task.title}>
              <Text
                variant="bodyLarge"
                style={task.isCompleted ? { textDecorationLine: 'line-through' } : undefined}
              >
                {task.title}
              </Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
});
