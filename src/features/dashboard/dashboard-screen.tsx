import { Fragment, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDockSpace } from '@/components/navigation/floating-dock';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  GradientCard,
  SectionHeader,
  Skeleton,
  Stagger,
  Text,
} from '@/components/ui';
import type { Note } from '@/domain/entities/note';
import type { Task } from '@/domain/entities/task';
import { isScheduledOn } from '@/domain/services/habit-engine';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { HabitCard } from '../habits/habit-card';
import { useHabits } from '../habits/hooks';
import { useNotes } from '../notes/hooks';
import { StreakMilestoneWatcher } from '../streaks/streak-milestone-watcher';
import { useProjects, useTodayTasks, useToggleTask } from '../tasks/hooks';
import { TaskListItem } from '../tasks/task-list-item';
import { DashboardHeader } from './dashboard-header';
import { FocusNowCard } from './focus-now-card';
import { HeroProgressCard } from './hero-progress-card';
import { useTodayProgress } from './hooks';
import { NextUpCard } from './next-up-card';
import { ProductivityCard } from './productivity-card';
import { currentTimeHHmm, pickNextUp } from './progress';
import { QuickNoteCard } from './quick-note-card';
import { StreakCard } from './streak-card';

const MAX_TASKS = 5;
const MAX_HABITS = 3;

export function DashboardScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const progress = useTodayProgress();
  const { data: tasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTodayTasks();
  const { data: habits } = useHabits();
  const { data: notes } = useNotes('active');
  const { data: projects } = useProjects();
  const toggleTask = useToggleTask();

  const today = todayIso();
  const nextUp = pickNextUp(tasks ?? [], currentTimeHHmm());
  const nextUpProject = nextUp?.projectId
    ? (projects?.find((project) => project.id === nextUp.projectId)?.name ?? null)
    : null;
  const todayTasks = (tasks ?? []).slice(0, MAX_TASKS);
  const moreTasks = (tasks?.length ?? 0) - todayTasks.length;
  const dashboardHabits = [...(habits ?? [])]
    .sort(
      (a, b) =>
        Number(isScheduledOn(b.daysOfWeek, today)) - Number(isScheduledOn(a.daysOfWeek, today)),
    )
    .slice(0, MAX_HABITS);
  const latestNote = (notes ?? []).reduce<Note | null>(
    (latest, note) => (!latest || note.updatedAt > latest.updatedAt ? note : latest),
    null,
  );

  const handleToggle = (task: Task) => toggleTask.mutate({ id: task.id, isCompleted: !task.isCompleted });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + theme.spacing.md, paddingBottom: dockSpace },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Stagger index={0}>
          <DashboardHeader />
        </Stagger>

        <Stagger index={1}>
          <HeroProgressCard
            done={progress.done}
            total={progress.total}
            ratio={progress.ratio}
            delta={progress.delta}
            loading={progress.isLoading}
          />
        </Stagger>

        <Stagger index={2} style={styles.bento}>
          <StreakCard style={styles.streak} onPress={() => router.navigate('/stats')} />
          <FocusNowCard style={styles.focus} />
        </Stagger>

        {nextUp ? (
          <Stagger index={3} style={styles.section}>
            <SectionHeader title="Next up" />
            <NextUpCard task={nextUp} projectName={nextUpProject} />
          </Stagger>
        ) : null}

        <Stagger index={4} style={styles.section}>
          <SectionHeader
            title="Today"
            actionLabel={moreTasks > 0 ? `See all ${tasks?.length}` : 'See all'}
            onAction={() => router.navigate('/tasks')}
          />
          {tasksLoading ? (
            <Skeleton height={140} radius={theme.radii.lg} />
          ) : tasksError ? (
            <ErrorState message="Couldn't load today's tasks." onRetry={() => refetchTasks()} />
          ) : todayTasks.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="sun"
                title="No tasks today 🎉"
                message="Nothing on the list. Enjoy the space — or plan something."
              />
              <Button label="Add a task" icon="plus" size="sm" onPress={() => router.push('/modal/new-task')} />
            </Card>
          ) : (
            <Card style={styles.groupCard}>
              <View style={[styles.groupInner, { borderRadius: theme.radii.lg }]}>
                {todayTasks.map((task, index) => (
                  <Fragment key={task.id}>
                    {index > 0 ? (
                      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                    ) : null}
                    <TaskListItem task={task} onToggle={handleToggle} variant="grouped" />
                  </Fragment>
                ))}
              </View>
            </Card>
          )}
        </Stagger>

        <Stagger index={5} style={styles.section}>
          <SectionHeader title="Habits" onAction={() => router.push('/habits')} />
          {dashboardHabits.length === 0 ? (
            <GradientCard gradient={theme.gradients.lavenderPink} orbs="glow" contentStyle={styles.habitCta}>
              <Text variant="titleLarge" style={styles.white}>
                Start your first habit
              </Text>
              <Text variant="bodySmall" style={styles.whiteMuted}>
                Every habit gets its own GitHub-style heatmap. Watch the squares fill in.
              </Text>
              <Button
                label="Create a habit"
                icon="plus"
                variant="glass"
                size="sm"
                onPress={() => router.push('/modal/new-habit')}
              />
            </GradientCard>
          ) : (
            dashboardHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                variant="compact"
                onPress={() => router.push(`/habit/${habit.id}`)}
              />
            ))
          )}
        </Stagger>

        <Stagger index={6}>
          <ProductivityCard onPress={() => router.navigate('/stats')} />
        </Stagger>

        <Stagger index={7} style={styles.section}>
          <SectionHeader title="Quick note" onAction={() => router.navigate('/notes')} />
          <QuickNoteCard note={latestNote} />
        </Stagger>
      </ScrollView>

      <StreakMilestoneWatcher />
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
  bento: {
    flexDirection: 'row',
    gap: 12,
  },
  streak: {
    flex: 1.3,
  },
  focus: {
    flex: 1,
  },
  section: {
    gap: 10,
  },
  groupCard: {
    padding: 0,
  },
  groupInner: {
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  emptyCard: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  habitCta: {
    gap: 8,
    alignItems: 'flex-start',
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.9)',
  },
});
