// app/types/task.ts
export type TaskStatus = "TO_DO" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Subtask {
  _id?: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string; 
  userId?: string;
  createdBy: string;
  orgId: string;
  assigneeId?: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  reminderAt?: string | null;
  completedAt?: string | null;
  tags: string[];
  subtasks: Subtask[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  reminderAt?: string | null;
  tags?: string[];
  subtasks?: Subtask[];
  assigneeId?: string | null;
  metadata?: Record<string, any>;
}