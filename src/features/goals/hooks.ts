import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as goalRepository from '@/data/repositories/goal-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import type { NewGoalInput, UpdateGoalInput } from '@/domain/entities/goal';

function invalidateGoals(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['goals'] });
}

export function useGoals() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: ['goals'], queryFn: () => goalRepository.listAll(db) });
}

export function useGoal(id: string) {
  const db = useSQLiteContext();
  return useQuery({ queryKey: ['goals', id], queryFn: () => goalRepository.getById(db, id) });
}

export function useGoalTasks(goalId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['goals', goalId, 'tasks'],
    queryFn: () => taskRepository.listByGoal(db, goalId),
  });
}

export function useCreateGoal() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewGoalInput) => goalRepository.create(db, input),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useUpdateGoal() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      goalRepository.update(db, id, input),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useArchiveGoal() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      goalRepository.setArchived(db, id, isArchived),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useDeleteGoal() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goalRepository.remove(db, id),
    onSuccess: () => invalidateGoals(queryClient),
  });
}
