import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, EmptyState, ErrorState, IconButton, Skeleton, Text } from '@/components/ui';
import { useDockSpace } from '@/components/navigation/floating-dock';
import { useAppTheme } from '@/theme';
import type { Task } from '@/domain/entities/task';

import { useAllTasks, useProjects, useToggleTask } from './hooks';
import { TaskListItem } from './task-list-item';

export function TaskListScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [showCompleted, setShowCompleted] = useState(true);

  const { data: tasks, isLoading, isError, refetch } = useAllTasks(projectId);
  const { data: projects } = useProjects();
  const toggleTask = useToggleTask();

  const visibleTasks = useMemo(
    () => (tasks ?? []).filter((task) => showCompleted || !task.isCompleted),
    [tasks, showCompleted],
  );

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

      {(projects?.length ?? 0) > 0 && (
        <View style={styles.filterRow}>
          <Chip label="All projects" selected={!projectId} onPress={() => setProjectId(undefined)} />
          {projects!.map((project) => (
            <Chip
              key={project.id}
              label={project.name}
              selected={projectId === project.id}
              onPress={() => setProjectId(project.id)}
            />
          ))}
        </View>
      )}

      <View style={styles.filterRow}>
        <Chip
          label={showCompleted ? 'Hide completed' : 'Show completed'}
          icon={showCompleted ? 'eye-off' : 'eye'}
          onPress={() => setShowCompleted((prev) => !prev)}
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
      ) : isError ? (
        <ErrorState message="Couldn't load your tasks." onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: dockSpace },
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
  },
});
