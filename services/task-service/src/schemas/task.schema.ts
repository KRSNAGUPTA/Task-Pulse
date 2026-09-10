import { z } from 'zod'
import { TaskPriority, TaskStatus } from '../models/task.model.js'

export const SubtaskSchema = z.object({
    title: z.string().trim().min(1, "Minimum 1 char is required"),
    isCompleted: z.boolean().default(false)
})

export const CreateTaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, 'Title cannot be empty')
        .max(120, 'Title cannot exceed 120 characters'),
    description: z.string().trim().default(''),
    status: z.enum(TaskStatus).default(TaskStatus.TO_DO),
    priority: z.enum(TaskPriority).default(TaskPriority.MEDIUM),
    dueDate: z.coerce.date().nullable().optional().default(null),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    subtasks: z.array(SubtaskSchema).optional().default([]),
    metadata: z.record(z.string(), z.unknown()).optional().default({})

})

export const UpdateTaskSchema = CreateTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>