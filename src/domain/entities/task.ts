import type { Project } from './project';
import type { Subtask } from './subtask';
import type { Tag } from './tag';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RepeatRule = 'daily' | 'weekdays' | 'weekly';
/** Where a task came from, when it was made from something else (e.g. a note's action items). */
export type TaskSourceType = 'NOTE';

export interface Task {
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
  notificationId: string | null;
  isArchived: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  sourceType: TaskSourceType | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithDetails extends Task {
  project: Project | null;
  tags: Tag[];
  subtasks: Subtask[];
}

export interface NewTaskInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  projectId?: string | null;
  goalId?: string | null;
  repeatRule?: RepeatRule | null;
  estimatedMinutes?: number | null;
  tagIds?: string[];
  seriesId?: string;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  sourceType?: TaskSourceType | null;
  sourceId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  projectId?: string | null;
  goalId?: string | null;
  repeatRule?: RepeatRule | null;
  estimatedMinutes?: number | null;
}
