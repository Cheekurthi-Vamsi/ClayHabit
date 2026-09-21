import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BentoCard, EmptyState, Icon, ProgressRing, Skeleton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import type { Task } from '@/domain/entities/task';
import { greetingForHour } from '@/utils/date';

import { useTodayTasks, useToggleTask } from '../tasks/hooks';
import { TaskListItem } from '../tasks/task-list-item';

export function DashboardScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: tasks, isLoading } = useTodayTasks();
  const toggleTask = useToggleTask();

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const total = tasks?.length ?? 0;
  const completed = tasks?.filter((task) => task.isCompleted).length ?? 0;
  const progress = total === 0 ? 0 : completed / total;

  const handleToggle = (task: Task) => {
    toggleTask.mutate({ id: task.id, isCompleted: !task.isCompleted });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.huge },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greetingRow}>
        <View>
          <Text variant="bodyMedium" color="textSecondary">
            {greeting}
          </Text>
          <Text variant="displayMedium">Your workspace 👋</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <BentoCard title="Today" icon="check-circle" span="half" accentGradient={theme.gradients.primary}>
          <View style={styles.progressRow}>
            <ProgressRing progress={progress} size={72} strokeWidth={8}>
              <Text variant="titleMedium">{`${completed}/${total}`}</Text>
            </ProgressRing>
            <View>
              <Text variant="headlineMedium">{Math.round(progress * 100)}%</Text>
              <Text variant="bodySmall" color="textSecondary">
                complete
              </Text>
            </View>
          </View>
        </BentoCard>

        <BentoCard
          title="Quick Add"
          icon="plus"
          span="half"
          accentGradient={theme.gradients.secondary}
          onPress={() => router.push('/modal/new-task')}
        >
          <View style={styles.quickAdd}>
            <View
              style={[
                styles.quickAddIcon,
                { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radii.full },
              ]}
            >
              <Icon name="plus" size={22} color={theme.colors.primary} />
            </View>
            <Text variant="titleMedium">New Task</Text>
          </View>
        </BentoCard>

        <BentoCard title="Today's Tasks" icon="list" span="full">
          {isLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={56} radius={theme.radii.md} />
              <Skeleton height={56} radius={theme.radii.md} />
            </View>
          ) : total === 0 ? (
            <EmptyState
              icon="sun"
              title="Nothing scheduled today"
              message="Enjoy your day, or add something to get ahead."
            />
          ) : (
            <View>
              {tasks!.slice(0, 5).map((task) => (
                <TaskListItem key={task.id} task={task} onToggle={handleToggle} />
              ))}
            </View>
          )}
        </BentoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quickAdd: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  quickAddIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
