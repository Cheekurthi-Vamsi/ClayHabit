import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as projectRepository from '@/data/repositories/project-repository';
import * as subtaskRepository from '@/data/repositories/subtask-repository';
import * as tagRepository from '@/data/repositories/tag-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import type { NewProjectInput } from '@/domain/entities/project';
import type { NewTaskInput, UpdateTaskInput } from '@/domain/entities/task';
import { todayIso } from '@/utils/date';

const keys = {
  today: ['tasks', 'today'] as const,
  all: (projectId?: string) => ['tasks', 'all', projectId ?? 'any'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  projects: ['projects'] as const,
  tags: ['tags'] as const,
  subtasks: (taskId: string) => ['subtasks', taskId] as const,
};

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}

export function useTodayTasks() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: keys.today, queryFn: () => taskRepository.listToday(db, todayIso()) });
}

export function useAllTasks(projectId?: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: keys.all(projectId),
    queryFn: () => taskRepository.listAll(db, { projectId }),
  });
}

export function useTaskDetails(id: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => taskRepository.getWithDetails(db, id),
  });
}

export function useCreateTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewTaskInput) => taskRepository.create(db, input),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useUpdateTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      taskRepository.update(db, id, input),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useToggleTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      taskRepository.setCompleted(db, id, isCompleted),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useArchiveTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      taskRepository.setArchived(db, id, isArchived),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useDeleteTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskRepository.remove(db, id),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useSetTaskTags() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, tagNames }: { taskId: string; tagNames: string[] }) => {
      const tags = await Promise.all(tagNames.map((name) => tagRepository.findOrCreateByName(db, name)));
      await tagRepository.setTagsForTask(db, taskId, tags.map((tag) => tag.id));
      return tags;
    },
    onSuccess: (_data, variables) => {
      invalidateTasks(queryClient);
      queryClient.invalidateQueries({ queryKey: keys.tags });
      queryClient.invalidateQueries({ queryKey: keys.detail(variables.taskId) });
    },
  });
}

export function useProjects() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: keys.projects, queryFn: () => projectRepository.listAll(db) });
}

export function useCreateProject() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewProjectInput) => projectRepository.create(db, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.projects }),
  });
}

export function useTags() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: keys.tags, queryFn: () => tagRepository.listAll(db) });
}

export function useAddSubtask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      subtaskRepository.create(db, taskId, title),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: keys.detail(variables.taskId) }),
  });
}

export function useToggleSubtask(taskId: string) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      subtaskRepository.setCompleted(db, id, isCompleted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.detail(taskId) }),
  });
}

export function useRemoveSubtask(taskId: string) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subtaskRepository.remove(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.detail(taskId) }),
  });
}
