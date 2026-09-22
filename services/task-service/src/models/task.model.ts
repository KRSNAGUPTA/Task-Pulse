import { Schema, model, type Document } from "mongoose";

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum TaskStatus {
  TO_DO = "TO_DO",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  [TaskPriority.LOW]: 0,
  [TaskPriority.MEDIUM]: 1,
  [TaskPriority.HIGH]: 2,
  [TaskPriority.URGENT]: 3,
};

// Tasks without a due date sort last when ordering by due date ascending.
export const NO_DUE_DATE = new Date("9999-12-31T00:00:00.000Z");

/**
 * priorityRank and dueSort are derived so priority / due date can be sorted in the
 * database (priority is a string, and null dates sort first in MongoDB).
 * Call this on every create and every update that touches priority or dueDate.
 */
export function deriveFields(input: {
  priority?: TaskPriority | undefined;
  dueDate?: Date | null | undefined;
}): { priorityRank?: number; dueSort?: Date } {
  const out: { priorityRank?: number; dueSort?: Date } = {};
  if (input.priority !== undefined) out.priorityRank = PRIORITY_RANK[input.priority];
  if (input.dueDate !== undefined) out.dueSort = input.dueDate ?? NO_DUE_DATE;
  return out;
}

export interface ISubTask {
  title: string;
  isCompleted: boolean;
}

export interface ITask {
  orgId: string;
  createdBy: string;
  assigneeId: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  priorityRank: number;
  dueDate: Date | null;
  dueSort: Date;
  reminderAt: Date | null;
  reminderSentAt: Date | null;
  completedAt: Date | null;
  tags: string[];
  subtasks: ISubTask[];
  metadata?: Record<string, unknown>;
}

export interface ITaskDocument extends ITask, Document {
  createdAt: Date;
  updatedAt: Date;
}

const toJSON = {
  virtuals: false,
  versionKey: false,
  transform(_doc: unknown, ret: any) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.priorityRank;
    delete ret.dueSort;
    return ret;
  },
};

const SubtaskSchema = new Schema<ISubTask>(
  {
    title: { type: String, required: true, trim: true, maxLength: 200 },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: true, toJSON }
);

const TaskSchema = new Schema<ITaskDocument>(
  {
    orgId: { type: String, required: true },
    createdBy: { type: String, required: true },
    assigneeId: { type: String, default: null },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxLength: [120, "Title cannot exceed 120 characters"],
    },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TO_DO },
    priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },
    priorityRank: { type: Number, default: PRIORITY_RANK[TaskPriority.MEDIUM] },
    dueDate: { type: Date, default: null },
    dueSort: { type: Date, default: NO_DUE_DATE },
    reminderAt: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    tags: { type: [String], default: [] },
    subtasks: { type: [SubtaskSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, toJSON }
);

TaskSchema.index({ orgId: 1, status: 1, dueSort: 1 });
TaskSchema.index({ orgId: 1, assigneeId: 1, status: 1 });
TaskSchema.index({ orgId: 1, createdAt: -1 });
TaskSchema.index({ orgId: 1, tags: 1 });
// Used by the notification service to find reminders that are due.
TaskSchema.index({ reminderAt: 1 }, { partialFilterExpression: { reminderAt: { $type: "date" } } });

export const Task = model<ITaskDocument>("Task", TaskSchema);