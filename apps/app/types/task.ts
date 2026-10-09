// app/types/task.ts
export type TaskStatus = "TO_DO" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
export type TaskPriority = "Low" | "MEDIUM" | "HIGH" | "URGENT";

export interface Subtask {
  title: string;
  isCompleted: boolean;
}

export interface Task {
  _id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
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
  tags?: string[];
  subtasks?: Subtask[];
  metadata?: Record<string, any>;
}