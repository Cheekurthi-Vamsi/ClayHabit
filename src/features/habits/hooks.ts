import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as habitRepository from '@/data/repositories/habit-repository';
import type {
  HabitWithLogs,
  NewHabitInput,
  UpdateHabitInput,
} from '@/domain/entities/habit';

const keys = {
  all: ['habits'] as const,
  detail: (id: string) => ['habits', id] as const,
};

type QueryClient = ReturnType<typeof useQueryClient>;

/** Habit check-ins feed the dashboard progress, the app-wide streak, and Stats. */
function invalidateHabitViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: keys.all });
  queryClient.invalidateQueries({ queryKey: ['activity'] });
  queryClient.invalidateQueries({ queryKey: ['streaks'] });
}

export function useHabits() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: keys.all, queryFn: () => habitRepository.listActiveWithLogs(db) });
}

export function useHabit(id: string) {
  const db = useSQLiteContext();
  return useQuery({ queryKey: keys.detail(id), queryFn: () => habitRepository.getWithLogs(db, id) });
}

export function useCreateHabit() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewHabitInput) => habitRepository.create(db, input),
    onSuccess: () => invalidateHabitViews(queryClient),
  });
}

export function useUpdateHabit() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateHabitInput }) =>
      habitRepository.update(db, id, input),
    onSuccess: () => invalidateHabitViews(queryClient),
  });
}

export function useArchiveHabit() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitRepository.setArchived(db, id, true),
    onSuccess: () => invalidateHabitViews(queryClient),
  });
}

export function useDeleteHabit() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitRepository.remove(db, id),
    onSuccess: () => invalidateHabitViews(queryClient),
  });
}

function patchLogs(habit: HabitWithLogs, date: string, count: number): HabitWithLogs {
  const logs = { ...habit.logs };
  if (count <= 0) delete logs[date];
  else logs[date] = count;
  return { ...habit, logs };
}

interface SetCountVariables {
  habitId: string;
  date: string;
  count: number;
}

/**
 * Writes an absolute count for one day. Optimistic: both the list and the
 * detail cache update before the SQLite write resolves, so the check button
 * and heatmap respond on the same frame as the tap.
 */
export function useSetHabitCount() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, date, count }: SetCountVariables) =>
      habitRepository.setCount(db, habitId, date, count),
    onMutate: async ({ habitId, date, count }) => {
      await queryClient.cancelQueries({ queryKey: keys.all });

      const previousList = queryClient.getQueryData<HabitWithLogs[]>(keys.all);
      const previousDetail = queryClient.getQueryData<HabitWithLogs | null>(keys.detail(habitId));

      queryClient.setQueryData<HabitWithLogs[]>(keys.all, (list) =>
        list?.map((habit) => (habit.id === habitId ? patchLogs(habit, date, count) : habit)),
      );
      queryClient.setQueryData<HabitWithLogs | null>(keys.detail(habitId), (habit) =>
        habit ? patchLogs(habit, date, count) : habit,
      );

      return { previousList, previousDetail };
    },
    onError: (_error, { habitId }, context) => {
      queryClient.setQueryData(keys.all, context?.previousList);
      queryClient.setQueryData(keys.detail(habitId), context?.previousDetail);
    },
    onSettled: () => invalidateHabitViews(queryClient),
  });
}
