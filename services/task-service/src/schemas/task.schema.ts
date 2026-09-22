import { z } from "zod";
import { TaskPriority, TaskStatus } from "../models/task.model.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const TaskIdParams = z.object({ taskId: objectId });
export const SubtaskParams = z.object({ taskId: objectId, subtaskId: objectId });

const title = z.string().trim().min(1, "Title is required").max(120, "Title cannot exceed 120 characters");
const subtaskTitle = z.string().trim().min(1).max(200);
const dateOrNull = z.coerce.date().nullable();

const tags = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(20)
  .transform((t) => [...new Set(t)]);

const fields = {
  title,
  description: z.string().trim().max(5000),
  status: z.enum(TaskStatus),
  priority: z.enum(TaskPriority),
  dueDate: dateOrNull,
  reminderAt: dateOrNull,
  assigneeId: z.string().trim().min(1).max(100).nullable(),
  tags,
  metadata: z.record(z.string(), z.unknown()),
};

export const SubtaskCreateSchema = z.object({
  title: subtaskTitle,
  isCompleted: z.boolean().default(false),
});

export const CreateTaskSchema = z.object({
  title: fields.title,
  description: fields.description.default(""),
  status: fields.status.default(TaskStatus.TO_DO),
  priority: fields.priority.default(TaskPriority.MEDIUM),
  dueDate: fields.dueDate.default(null),
  reminderAt: fields.reminderAt.default(null),
  assigneeId: fields.assigneeId.default(null),
  tags: fields.tags.default([]),
  subtasks: z.array(SubtaskCreateSchema).max(50).default([]),
  metadata: fields.metadata.default({}),
});

// No defaults here: a PATCH with { title } must not reset status, tags, etc.
// Subtasks are changed through their own endpoints.
export const UpdateTaskSchema = z
  .object(fields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: "At least one field is required" });

export const UpdateSubtaskSchema = z
  .object({ title: subtaskTitle, isCompleted: z.boolean() })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: "At least one field is required" });

export const CreateSubtaskSchema = z.object({ title: subtaskTitle });

// ?status=TO_DO,IN_PROGRESS and ?status=TO_DO&status=IN_PROGRESS both work.
const csv = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (v) =>
      (Array.isArray(v) ? v.join(",") : typeof v === "string" ? v : undefined)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    z.array(item).min(1)
  );

export const SORT_OPTIONS = ["dueDate", "createdAt", "-createdAt", "updatedAt", "priority"] as const;

export const ListQuerySchema = z.object({
  status: csv(z.enum(TaskStatus)).optional(),
  priority: csv(z.enum(TaskPriority)).optional(),
  tag: z.string().trim().toLowerCase().min(1).max(30).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  assignee: z.string().trim().min(1).max(100).optional(), // "me" or a user id
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  overdue: z.stringbool().optional(),
  includeArchived: z.stringbool().default(false),
  sort: z.enum(SORT_OPTIONS).default("-createdAt"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const StatsQuerySchema = z.object({
  // minutes, same value as `new Date().getTimezoneOffset()` in the browser (IST = -330)
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
});

export type ListQuery = z.infer<typeof ListQuerySchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;