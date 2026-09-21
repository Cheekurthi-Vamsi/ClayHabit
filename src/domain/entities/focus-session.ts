export interface FocusSession {
  id: string;
  taskId: string | null;
  plannedMinutes: number;
  actualMinutes: number | null;
  startedAt: string;
  endedAt: string | null;
  isCompleted: boolean;
}

export interface NewFocusSessionInput {
  taskId?: string | null;
  plannedMinutes: number;
}
