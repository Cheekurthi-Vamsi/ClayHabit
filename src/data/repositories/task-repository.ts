import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  NewTaskInput,
  RepeatRule,
  Task,
  TaskPriority,
  TaskWithDetails,
  UpdateTaskInput,
} from '@/domain/entities/task';
import { nextOccurrence } from '@/domain/services/recurrence';
import { todayIso } from '@/utils/date';
import { generateId } from '@/utils/id';

import * as completionRepository from './completion-repository';
import * as projectRepository from './project-repository';
import * as tagRepository from './tag-repository';
import * as subtaskRepository from './subtask-repository';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  project_id: string | null;
  goal_id: string | null;
  repeat_rule: RepeatRule | null;
  estimated_minutes: number | null;
  series_id: string;
  reminder_enabled: number;
  reminder_time: string | null;
  notification_id: string | null;
  is_archived: number;
  is_completed: number;
  completed_at: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    dueTime: row.due_time,
    priority: row.priority,
    projectId: row.project_id,
    goalId: row.goal_id,
    repeatRule: row.repeat_rule,
    estimatedMinutes: row.estimated_minutes,
    seriesId: row.series_id,
    reminderEnabled: row.reminder_enabled === 1,
    reminderTime: row.reminder_time,
    notificationId: row.notification_id,
    isArchived: row.is_archived === 1,
    isCompleted: row.is_completed === 1,
    completedAt: row.completed_at,
    sourceType: row.source_type === 'NOTE' ? 'NOTE' : null,
    sourceId: row.source_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listToday(db: SQLiteDatabase, todayIso: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE is_archived = 0 AND (due_date = ? OR due_date IS NULL)
     ORDER BY is_completed ASC, priority = 'urgent' DESC, priority = 'high' DESC, due_time ASC, created_at ASC`,
    todayIso,
  );
  return rows.map(toTask);
}

interface ListAllOptions {
  projectId?: string;
  includeArchived?: boolean;
}

export async function listAll(db: SQLiteDatabase, options: ListAllOptions = {}): Promise<Task[]> {
  const conditions = [options.includeArchived ? '1=1' : 'is_archived = 0'];
  const params: string[] = [];

  if (options.projectId) {
    conditions.push('project_id = ?');
    params.push(options.projectId);
  }

  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE ${conditions.join(' AND ')}
     ORDER BY is_completed ASC, due_date IS NULL, due_date ASC, created_at DESC`,
    ...params,
  );
  return rows.map(toTask);
}

export async function listForDateRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string,
): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE is_archived = 0 AND due_date BETWEEN ? AND ?
     ORDER BY due_date ASC, due_time ASC`,
    startIso,
    endIso,
  );
  return rows.map(toTask);
}

export async function listByGoal(db: SQLiteDatabase, goalId: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE goal_id = ? AND is_archived = 0 ORDER BY created_at DESC',
    goalId,
  );
  return rows.map(toTask);
}

export async function countTable(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks');
  return row?.count ?? 0;
}

export async function getById(db: SQLiteDatabase, id: string): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
  return row ? toTask(row) : null;
}

export async function getWithDetails(
  db: SQLiteDatabase,
  id: string,
): Promise<TaskWithDetails | null> {
  const task = await getById(db, id);
  if (!task) return null;

  const [projects, tags, subtasks] = await Promise.all([
    task.projectId ? projectRepository.listAll(db) : Promise.resolve([]),
    tagRepository.listForTask(db, id),
    subtaskRepository.listForTask(db, id),
  ]);

  const project = task.projectId ? (projects.find((p) => p.id === task.projectId) ?? null) : null;

  return { ...task, project, tags, subtasks };
}

async function insertTaskRow(
  db: SQLiteDatabase,
  values: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    dueTime: string | null;
    priority: TaskPriority;
    projectId: string | null;
    goalId: string | null;
    repeatRule: RepeatRule | null;
    estimatedMinutes: number | null;
    seriesId: string;
    reminderEnabled: boolean;
    reminderTime: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    createdAt: string;
    updatedAt: string;
  },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO tasks (
       id, title, description, due_date, due_time, priority, project_id, goal_id,
       repeat_rule, estimated_minutes, series_id, reminder_enabled, reminder_time,
       notification_id, is_archived, is_completed, completed_at, source_type, source_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, NULL, ?, ?, ?, ?)`,
    values.id,
    values.title,
    values.description,
    values.dueDate,
    values.dueTime,
    values.priority,
    values.projectId,
    values.goalId,
    values.repeatRule,
    values.estimatedMinutes,
    values.seriesId,
    values.reminderEnabled ? 1 : 0,
    values.reminderTime,
    values.sourceType ?? null,
    values.sourceId ?? null,
    values.createdAt,
    values.updatedAt,
  );
}

export async function create(db: SQLiteDatabase, input: NewTaskInput): Promise<Task> {
  const id = generateId();
  const seriesId = input.seriesId ?? id;
  const now = new Date().toISOString();
  const priority: TaskPriority = input.priority ?? 'medium';
  const reminderEnabled = input.reminderEnabled ?? false;
  const reminderTime = input.reminderTime ?? null;

  await insertTaskRow(db, {
    id,
    title: input.title.trim(),
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    priority,
    projectId: input.projectId ?? null,
    goalId: input.goalId ?? null,
    repeatRule: input.repeatRule ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    seriesId,
    reminderEnabled,
    reminderTime,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  if (input.tagIds?.length) {
    await tagRepository.setTagsForTask(db, id, input.tagIds);
  }

  return {
    id,
    title: input.title.trim(),
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    priority,
    projectId: input.projectId ?? null,
    goalId: input.goalId ?? null,
    repeatRule: input.repeatRule ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    seriesId,
    reminderEnabled,
    reminderTime,
    notificationId: null,
    isArchived: false,
    isCompleted: false,
    completedAt: null,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function setReminder(
  db: SQLiteDatabase,
  id: string,
  input: { enabled: boolean; time: string | null; notificationId: string | null },
): Promise<void> {
  await db.runAsync(
    'UPDATE tasks SET reminder_enabled = ?, reminder_time = ?, notification_id = ? WHERE id = ?',
    input.enabled ? 1 : 0,
    input.time,
    input.notificationId,
    id,
  );
}

export async function update(
  db: SQLiteDatabase,
  id: string,
  input: UpdateTaskInput,
): Promise<void> {
  const existing = await getById(db, id);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET
       title = ?, description = ?, due_date = ?, due_time = ?, priority = ?,
       project_id = ?, goal_id = ?, repeat_rule = ?, estimated_minutes = ?, updated_at = ?
     WHERE id = ?`,
    input.title?.trim() ?? existing.title,
    input.description !== undefined ? input.description : existing.description,
    input.dueDate !== undefined ? input.dueDate : existing.dueDate,
    input.dueTime !== undefined ? input.dueTime : existing.dueTime,
    input.priority ?? existing.priority,
    input.projectId !== undefined ? input.projectId : existing.projectId,
    input.goalId !== undefined ? input.goalId : existing.goalId,
    input.repeatRule !== undefined ? input.repeatRule : existing.repeatRule,
    input.estimatedMinutes !== undefined ? input.estimatedMinutes : existing.estimatedMinutes,
    now,
    id,
  );
}

export async function setArchived(
  db: SQLiteDatabase,
  id: string,
  isArchived: boolean,
): Promise<void> {
  await db.runAsync(
    'UPDATE tasks SET is_archived = ?, updated_at = ? WHERE id = ?',
    isArchived ? 1 : 0,
    new Date().toISOString(),
    id,
  );
}

export async function remove(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}

export async function setCompleted(
  db: SQLiteDatabase,
  id: string,
  isCompleted: boolean,
): Promise<{ nextOccurrence: Task | null }> {
  const task = await getById(db, id);
  if (!task) return { nextOccurrence: null };

  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    isCompleted ? 1 : 0,
    isCompleted ? now : null,
    now,
    id,
  );

  const occurredOn = task.dueDate ?? todayIso();

  if (!isCompleted) {
    await completionRepository.removeCompletion(db, task.seriesId, occurredOn);
    return { nextOccurrence: null };
  }

  await completionRepository.recordCompletion(db, id, task.seriesId, occurredOn);

  if (!task.repeatRule || !task.dueDate) return { nextOccurrence: null };

  const tags = await tagRepository.listForTask(db, id);

  const nextOccurrenceTask = await create(db, {
    title: task.title,
    description: task.description,
    dueDate: nextOccurrence(task.dueDate, task.repeatRule),
    dueTime: task.dueTime,
    priority: task.priority,
    projectId: task.projectId,
    goalId: task.goalId,
    repeatRule: task.repeatRule,
    estimatedMinutes: task.estimatedMinutes,
    tagIds: tags.map((tag) => tag.id),
    seriesId: task.seriesId,
    reminderEnabled: task.reminderEnabled,
    reminderTime: task.reminderTime,
  });

  return { nextOccurrence: nextOccurrenceTask };
}

export async function getStreakDates(db: SQLiteDatabase, seriesId: string): Promise<string[]> {
  return completionRepository.listDatesForSeries(db, seriesId);
}
