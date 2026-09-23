import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

import * as projectRepository from '@/data/repositories/project-repository';
import * as subtaskRepository from '@/data/repositories/subtask-repository';
import * as tagRepository from '@/data/repositories/tag-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import type { NewProjectInput } from '@/domain/entities/project';
import type { NewTaskInput, Task, UpdateTaskInput } from '@/domain/entities/task';
import {
  cancelAllReminders,
  cancelReminder,
  requestPermission,
  scheduleTaskReminder,
} from '@/lib/notifications/notification-service';
import { addDaysIso, combineDateAndTime, todayIso } from '@/utils/date';

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

function reminderDateFor(task: Task, time: string): Date | null {
  if (!task.dueDate) return null;
  return combineDateAndTime(task.dueDate, time);
}

export async function scheduleReminderForTask(
  db: SQLiteDatabase,
  task: Task,
  enabled: boolean,
  time: string | null,
): Promise<void> {
  await cancelReminder(task.notificationId);

  const date = enabled && time ? reminderDateFor(task, time) : null;
  if (!enabled || !time || !date) {
    await taskRepository.setReminder(db, task.id, { enabled: false, time: null, notificationId: null });
    return;
  }

  // A trigger in the past would fire immediately; keep the preference but schedule nothing.
  if (date.getTime() <= Date.now()) {
    await taskRepository.setReminder(db, task.id, { enabled: true, time, notificationId: null });
    return;
  }

  const notificationId = await scheduleTaskReminder({
    taskId: task.id,
    title: task.title,
    body: 'Task reminder',
    date,
  });

  await taskRepository.setReminder(db, task.id, { enabled: true, time, notificationId });
}

/**
 * After the Cloud replaces this phone's data, the reminders scheduled here
 * belong to the old data (and the restored ones were scheduled on another
 * phone). Start over from what the database now says.
 */
export async function rescheduleAllReminders(db: SQLiteDatabase): Promise<void> {
  await cancelAllReminders();
  const tasks = await taskRepository.listAll(db);
  for (const task of tasks) {
    if (task.isCompleted || !task.reminderEnabled || !task.reminderTime) continue;
    await scheduleReminderForTask(db, task, true, task.reminderTime).catch(() => {});
  }
}

/**
 * Brings the OS-scheduled notification in line with the task's current
 * state: a completed, archived, or reminder-less task has nothing pending;
 * anything else gets (re)scheduled for its current due date. The reminder
 * *preference* survives completion, so un-completing restores it.
 */
async function syncReminder(db: SQLiteDatabase, id: string): Promise<void> {
  const task = await taskRepository.getById(db, id);
  if (!task) return;

  if (task.isCompleted || task.isArchived || !task.reminderEnabled || !task.reminderTime) {
    if (task.notificationId) {
      await cancelReminder(task.notificationId);
      await taskRepository.setReminder(db, id, {
        enabled: task.reminderEnabled,
        time: task.reminderTime,
        notificationId: null,
      });
    }
    return;
  }

  await scheduleReminderForTask(db, task, true, task.reminderTime);
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
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskInput }) => {
      await taskRepository.update(db, id, input);
      if (input.dueDate !== undefined) await syncReminder(db, id);
    },
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useToggleTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const result = await taskRepository.setCompleted(db, id, isCompleted);
      await syncReminder(db, id);
      const next = result.nextOccurrence;
      if (next?.reminderEnabled && next.reminderTime) {
        await scheduleReminderForTask(db, next, true, next.reminderTime);
      }
      return result;
    },
    onSuccess: () => {
      invalidateTasks(queryClient);
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

/** Pushes a task to tomorrow, moving its reminder along with it. */
export function useSnoozeTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await taskRepository.update(db, id, { dueDate: addDaysIso(todayIso(), 1) });
      await syncReminder(db, id);
    },
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useSetReminder() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      task,
      enabled,
      time,
    }: {
      task: Task;
      enabled: boolean;
      time: string | null;
    }) => {
      if (enabled) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Notification permission was not granted.');
        }
      }
      await scheduleReminderForTask(db, task, enabled, time);
    },
    onSuccess: (_data, variables) => {
      invalidateTasks(queryClient);
      queryClient.invalidateQueries({ queryKey: keys.detail(variables.task.id) });
    },
  });
}

export function useArchiveTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      await taskRepository.setArchived(db, id, isArchived);
      await syncReminder(db, id);
    },
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useDeleteTask() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const task = await taskRepository.getById(db, id);
      await cancelReminder(task?.notificationId ?? null);
      await taskRepository.remove(db, id);
    },
    onSuccess: () => {
      invalidateTasks(queryClient);
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
    },
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
