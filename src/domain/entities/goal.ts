export interface Goal {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalWithProgress extends Goal {
  taskCount: number;
  completedTaskCount: number;
}

export interface NewGoalInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  deadline?: string | null;
}
