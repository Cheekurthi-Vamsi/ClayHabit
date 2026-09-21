import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BentoCard, Chip, EmptyState, IconButton, ProgressRing, Skeleton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import type { Note } from '@/domain/entities/note';
import type { Task } from '@/domain/entities/task';
import { greetingForHour } from '@/utils/date';
import { getPreviewText } from '@/utils/markdown';

import { useCreateNote, useNotes } from '../notes/hooks';
import { useOverallStreak } from '../streaks/hooks';
import { useTodayTasks, useToggleTask } from '../tasks/hooks';
import { TaskListItem } from '../tasks/task-list-item';

export function DashboardScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: tasks, isLoading } = useTodayTasks();
  const { data: streak } = useOverallStreak();
  const { data: notes } = useNotes('active');
  const toggleTask = useToggleTask();
  const createNote = useCreateNote();

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const total = tasks?.length ?? 0;
  const completed = tasks?.filter((task) => task.isCompleted).length ?? 0;
  const progress = total === 0 ? 0 : completed / total;

  const mostRecentNote = useMemo(
    () =>
      (notes ?? []).reduce<Note | null>(
        (latest, note) => (!latest || note.updatedAt > latest.updatedAt ? note : latest),
        null,
      ),
    [notes],
  );

  const handleToggle = (task: Task) => {
    toggleTask.mutate({ id: task.id, isCompleted: !task.isCompleted });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.huge,
          },
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

        <View style={styles.quickActionsRow}>
          <Chip
            icon="file-text"
            label="New Note"
            onPress={() => createNote.mutate(undefined, { onSuccess: (note) => router.push(`/note/${note.id}`) })}
          />
          <Chip icon="clock" label="Focus" onPress={() => router.push('/focus')} />
          <Chip icon="target" label="Goals" onPress={() => router.push('/goal')} />
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

          <BentoCard title="Streak" icon="zap" span="half" accentGradient={theme.gradients.mintCyan}>
            <View style={styles.streakBody}>
              <Text variant="displayMedium">{streak?.current ?? 0}</Text>
              <Text variant="bodySmall" color="textSecondary">
                {streak && streak.current > 0 ? 'day streak 🔥' : 'complete a task to start'}
              </Text>
              {streak && streak.best > streak.current && (
                <Text variant="caption" color="textTertiary">
                  Best: {streak.best} days
                </Text>
              )}
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

          <BentoCard
            title="Quick Note"
            icon="file-text"
            span="full"
            onPress={() =>
              mostRecentNote ? router.push(`/note/${mostRecentNote.id}`) : router.push('/(tabs)/notes')
            }
          >
            {mostRecentNote ? (
              <View style={{ gap: 4 }}>
                <Text variant="titleMedium" numberOfLines={1}>
                  {mostRecentNote.title.trim() || 'New Note'}
                </Text>
                <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
                  {getPreviewText(mostRecentNote.body) || 'No additional text'}
                </Text>
              </View>
            ) : (
              <EmptyState icon="file-text" title="No notes yet" message="Tap to write your first note." />
            )}
          </BentoCard>
        </View>
      </ScrollView>

      <View style={[styles.fab, { bottom: insets.bottom + theme.spacing.xl }]}>
        <IconButton
          name="plus"
          variant="filled"
          size={56}
          accessibilityLabel="Add task"
          onPress={() => router.push('/modal/new-task')}
        />
      </View>
    </View>
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
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  streakBody: {
    gap: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
});
