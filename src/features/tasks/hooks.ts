import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as taskRepository from '@/data/repositories/task-repository';
import type { NewTaskInput } from '@/domain/entities/task';
import { todayIso } from '@/utils/date';

const tasksKey = {
  today: ['tasks', 'today'] as const,
  all: ['tasks', 'all'] as const,
};

export function useTodayTasks() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: tasksKey.today,
    queryFn: () => taskRepository.listToday(db, todayIso()),
  });
}

export function useAllTasks() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: tasksKey.all,
    queryFn: () => taskRepository.listAll(db),
  });
}

export function useCreateTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewTaskInput) => taskRepository.create(db, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useToggleTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      taskRepository.setCompleted(db, id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
