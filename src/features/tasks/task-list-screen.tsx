import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, IconButton, Skeleton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import type { Task } from '@/domain/entities/task';

import { useAllTasks, useToggleTask } from './hooks';
import { TaskListItem } from './task-list-item';

export function TaskListScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: tasks, isLoading } = useAllTasks();
  const toggleTask = useToggleTask();

  const handleToggle = (task: Task) => {
    toggleTask.mutate({ id: task.id, isCompleted: !task.isCompleted });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text variant="displayMedium">Tasks</Text>
        <IconButton
          name="plus"
          variant="filled"
          accessibilityLabel="Add task"
          onPress={() => router.push('/modal/new-task')}
        />
      </View>

      {isLoading ? (
        <View style={styles.list}>
          <Skeleton height={64} radius={theme.radii.lg} />
          <View style={{ height: 10 }} />
          <Skeleton height={64} radius={theme.radii.lg} />
          <View style={{ height: 10 }} />
          <Skeleton height={64} radius={theme.radii.lg} />
        </View>
      ) : (
        <FlatList
          data={tasks ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + theme.spacing.huge },
          ]}
          renderItem={({ item }) => <TaskListItem task={item} onToggle={handleToggle} />}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title="No tasks yet"
              message="Add your first task to start building your workspace."
            />
          }
        />
      )}
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
  list: {
    paddingHorizontal: 20,
  },
});
