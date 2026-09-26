import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as activityRepository from '@/data/repositories/activity-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import { addDaysIso, startOfWeekIso, todayIso } from '@/utils/date';

import { useHabits } from '../habits/hooks';
import { useTodayTasks } from '../tasks/hooks';
import { progressFor } from './progress';

function useYesterdayTasks() {
  const db = useSQLiteContext();
  const yesterday = addDaysIso(todayIso(), -1);
  return useQuery({
    queryKey: ['tasks', 'range', yesterday, yesterday],
    queryFn: () => taskRepository.listForDateRange(db, yesterday, yesterday),
  });
}

export function useTodayProgress() {
  const today = todayIso();
  const tasks = useTodayTasks();
  const habits = useHabits();
  const yesterdayTasks = useYesterdayTasks();

  const todayProgress = progressFor(today, tasks.data ?? [], habits.data ?? []);
  const yesterday = progressFor(addDaysIso(today, -1), yesterdayTasks.data ?? [], habits.data ?? []);

  const ratio = todayProgress.total === 0 ? 0 : todayProgress.done / todayProgress.total;
  const yesterdayRatio = yesterday.total === 0 ? null : yesterday.done / yesterday.total;

  return {
    ...todayProgress,
    ratio,
    /** Percentage-point change vs yesterday; null when yesterday had nothing planned. */
    delta: yesterdayRatio === null ? null : Math.round((ratio - yesterdayRatio) * 100),
    isLoading: tasks.isLoading || habits.isLoading,
    isError: tasks.isError || habits.isError,
    refetch: () => {
      tasks.refetch();
      habits.refetch();
    },
  };
}

export function useActivity(startIso: string, endIso: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['activity', startIso, endIso],
    queryFn: () => activityRepository.countsByDate(db, startIso, endIso),
  });
}

/** Mon–Sun totals for the current week, plus which index is today. */
export function useWeekActivity() {
  const today = todayIso();
  const monday = startOfWeekIso(today);
  const sunday = addDaysIso(monday, 6);
  const query = useActivity(monday, sunday);

  const values = Array.from({ length: 7 }, (_, index) => query.data?.total[addDaysIso(monday, index)] ?? 0);
  const todayIndex = values.findIndex((_, index) => addDaysIso(monday, index) === today);

  return { ...query, values, todayIndex };
}

/**
 * This week's total so far against the same stretch of last week (Monday up
 * to the same weekday), so a Tuesday isn't compared with a whole week.
 */
export function useWeekComparison() {
  const today = todayIso();
  const week = useWeekActivity();
  const lastMonday = addDaysIso(startOfWeekIso(today), -7);
  const lastSameDay = addDaysIso(today, -7);
  const last = useActivity(lastMonday, lastSameDay);

  const total = week.values.reduce((sum, value) => sum + value, 0);
  const lastTotal = Object.values(last.data?.total ?? {}).reduce((sum, value) => sum + value, 0);

  return {
    values: week.values,
    todayIndex: week.todayIndex,
    total,
    /** Change vs the same days last week; null until last week has loaded. */
    change: last.data ? total - lastTotal : null,
    isLoading: week.isLoading,
  };
}
