import { Fragment, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnvironmentSwitcher } from '@/components/navigation/environment-switcher';
import { useDockSpace } from '@/components/navigation/floating-dock';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  SectionHeader,
  Skeleton,
  SpotlightCard,
  Stagger,
  Text,
} from '@/components/ui';
import type { NoteSummary } from '@/domain/entities/note';
import type { Task } from '@/domain/entities/task';
import { isScheduledOn } from '@/domain/services/habit-engine';
import { fontFamily, useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { FinanceEntryCard } from '../finance/finance-entry-card';
import { HabitCard } from '../habits/habit-card';
import { useHabits } from '../habits/hooks';
import { useNotes } from '../notes/hooks';
import { StreakMilestoneWatcher } from '../streaks/streak-milestone-watcher';
import { useProjects, useTodayTasks, useToggleTask } from '../tasks/hooks';
import { TaskListItem } from '../tasks/task-list-item';
import { DashboardHeader } from './dashboard-header';
import { FocusNowCard } from './focus-now-card';
import { useWeekComparison } from './hooks';
import { NextUpCard } from './next-up-card';
import { currentTimeHHmm, pickNextUp } from './progress';
import { QuickNoteCard } from './quick-note-card';
import { StreakCard } from './streak-card';
import { TodayPanel } from './today-panel';
import { WeekColumns } from './week-columns';
import { WelcomeBanner } from './welcome-banner';

const MAX_TASKS = 5;
const MAX_HABITS = 3;
/** How far the dark panel tucks under the hero sheet's rounded bottom. */
const TUCK = 36;

function weekChangeText(change: number | null): string {
  if (change === null) return '';
  if (change === 0) return 'Same as this time last week.';
  return `${Math.abs(change)} ${change > 0 ? 'more' : 'fewer'} than this time last week.`;
}

export function DashboardScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const week = useWeekComparison();
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
  const latestNote = (notes ?? []).reduce<NoteSummary | null>(
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
        contentContainerStyle={{ paddingBottom: dockSpace }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressViewOffset={insets.top}
          />
        }
      >
        {/* A light hero sheet (header, streak, focus) over the dark target panel, as in images/Dashboard design 3.jpg. */}
        <LinearGradient
          colors={theme.gradients.heroSoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.sheet, { paddingTop: insets.top + theme.spacing.md, shadowColor: theme.colors.panel }]}
        >
          <Stagger index={0} style={styles.top}>
            <EnvironmentSwitcher current="productivity" />
            <DashboardHeader />
            <WelcomeBanner />
          </Stagger>
          <Stagger index={1} style={styles.bento}>
            <StreakCard style={styles.streak} onPress={() => router.navigate('/stats')} />
            <FocusNowCard style={styles.focus} />
          </Stagger>
        </LinearGradient>

        <Stagger index={2} style={styles.tuck}>
          <TodayPanel style={styles.panel} />
        </Stagger>

        <View style={styles.content}>
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
              <SpotlightCard
                title="Start your first habit"
                body="Every habit gets its own heatmap. Watch the squares fill in."
                onPress={() => router.push('/modal/new-habit')}
                accessibilityHint="Creates a habit"
              />
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

          <Stagger index={6} style={styles.section}>
            <SectionHeader title="This week" onAction={() => router.navigate('/stats')} actionLabel="Stats" />
            <Card style={styles.week}>
              {week.isLoading ? (
                <Skeleton height={120} radius={theme.radii.md} />
              ) : (
                <WeekColumns values={week.values} todayIndex={week.todayIndex} />
              )}
              <View style={styles.weekTotal}>
                <Text style={[styles.weekNumber, { color: theme.colors.textPrimary }]}>{week.total}</Text>
                <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
                  {week.total === 1 ? 'task or habit done.' : 'tasks and habits done.'} {weekChangeText(week.change)}
                </Text>
              </View>
            </Card>
          </Stagger>

          <Stagger index={7} style={styles.section}>
            <SectionHeader title="Quick note" onAction={() => router.navigate('/notes')} />
            <QuickNoteCard note={latestNote} />
          </Stagger>

          <Stagger index={8}>
            <FinanceEntryCard />
          </Stagger>
        </View>
      </ScrollView>

      <StreakMilestoneWatcher />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 22,
    borderBottomLeftRadius: TUCK,
    borderBottomRightRadius: TUCK,
    zIndex: 2,
    elevation: 6,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  top: {
    gap: 18,
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
  week: {
    gap: 12,
  },
  weekTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekNumber: {
    fontFamily: fontFamily.extraBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  tuck: {
    marginTop: -TUCK,
    zIndex: 1,
  },
  panel: {
    paddingTop: TUCK + 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: TUCK,
    borderBottomRightRadius: TUCK,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
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
});
