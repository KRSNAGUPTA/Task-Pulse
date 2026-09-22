import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { Task, TaskStatus, deriveFields, type ITaskDocument } from "../models/task.model.js";
import {
  CreateSubtaskSchema,
  CreateTaskSchema,
  ListQuerySchema,
  StatsQuerySchema,
  SubtaskParams,
  TaskIdParams,
  UpdateSubtaskSchema,
  UpdateTaskSchema,
} from "../schemas/task.schema.js";
import { buildListFilter, buildSort, dayBounds } from "../utility/taskQuery.js";
import { canDelete, canEdit } from "../utility/permissions.js";
import { redisUtil } from "../utility/redisUtility.js";

const ITEM_TTL = 15*60; // seconds
const LIST_TTL = 120; // lists/stats are short-lived: they also depend on "now"

// ---------- cache helpers ----------
// Lists are cached under a per-org version number. Any write bumps the version, which
// orphans every cached list for that org at once (they expire by TTL). This is what
// makes caching filtered/paginated lists safe.
const versionKey = (orgId: string) => `tasks:${orgId}:v`;
const itemKey = (orgId: string, taskId: string) => `task:${orgId}:${taskId}`;

async function scopedKey(orgId: string, kind: string, payload: unknown): Promise<string> {
  const version = await redisUtil.getVersion(versionKey(orgId));
  const hash = createHash("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  return `tasks:${orgId}:v${version}:${kind}:${hash}`;
}

async function invalidate(orgId: string, taskId?: string): Promise<void> {
  await Promise.all([
    redisUtil.incr(versionKey(orgId)),
    taskId ? redisUtil.del(itemKey(orgId, taskId)) : Promise.resolve(),
  ]);
}

// ---------- response helpers ----------
const validationError = (res: Response, error: z.ZodError) =>
  res.status(422).json({ message: "Validation failed", errors: z.flattenError(error) });

const badId = (res: Response) => res.status(400).json({ message: "Invalid id" });

const serverError = (res: Response, label: string, error: any) => {
  console.error(`${label}: ${error?.message || error}`);
  return res.status(500).json({ message: "Internal Server Error" });
};

type Loaded = { task: ITaskDocument } | null;

/** Loads a task inside the caller's org and checks edit rights. Sends the error response itself. */
async function loadForEdit(req: Request, res: Response, taskId: string, check = canEdit): Promise<Loaded> {
  const user = req.user!;
  const task = await Task.findOne({ _id: taskId, orgId: user.orgId });
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  if (!check(user, task)) {
    res.status(403).json({ message: "You don't have permission to modify this task" });
    return null;
  }
  return { task };
}

// ---------- handlers ----------
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const { userId, orgId } = req.user!;
    const data = parsed.data;

    const task = await Task.create({
      ...data,
      ...deriveFields(data),
      orgId,
      createdBy: userId,
      completedAt: data.status === TaskStatus.COMPLETED ? new Date() : null,
    });

    await invalidate(orgId);
    res.status(201).json({ message: "Task created", data: task });
  } catch (error) {
    serverError(res, "Create Task Error", error);
  }
};

export const getAllTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const { userId, orgId } = req.user!;
    const q = parsed.data;

    const cacheKey = await scopedKey(orgId, "list", {
      ...q,
      assignee: q.assignee === "me" ? userId : q.assignee,
    });
    const cached = await redisUtil.get(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT").status(200).json(JSON.parse(cached));
      return;
    }

    const filter = buildListFilter(q, { orgId, userId, now: new Date() });
    const [items, total] = await Promise.all([
      Task.find(filter)
        .sort(buildSort(q.sort))
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      Task.countDocuments(filter),
    ]);

    const payload = {
      message: "Tasks fetched",
      data: items,
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    };

    await redisUtil.set(cacheKey, JSON.stringify(payload), LIST_TTL);
    res.set("X-Cache", "MISS").status(200).json(payload);
  } catch (error) {
    serverError(res, "Get All Tasks Error", error);
  }
};

export const getTaskStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = StatsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const { orgId } = req.user!;
    const { tzOffset } = parsed.data;

    const cacheKey = await scopedKey(orgId, "stats", { tzOffset });
    const cached = await redisUtil.get(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT").status(200).json(JSON.parse(cached));
      return;
    }

    const now = new Date();
    const { start, end } = dayBounds(now, tzOffset);
    const open = { $nin: [TaskStatus.COMPLETED, TaskStatus.ARCHIVED] };

    const [result] = await Task.aggregate([
      { $match: { orgId } },
      {
        $facet: {
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          overdue: [{ $match: { status: open, dueDate: { $lt: now } } }, { $count: "n" }],
          dueToday: [{ $match: { status: open, dueDate: { $gte: start, $lt: end } } }, { $count: "n" }],
          completedToday: [{ $match: { completedAt: { $gte: start, $lt: end } } }, { $count: "n" }],
        },
      },
    ]);

    const byStatus: Record<string, number> = {
      [TaskStatus.TO_DO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.ARCHIVED]: 0,
    };
    for (const row of result?.byStatus ?? []) byStatus[row._id] = row.count;

    const payload = {
      message: "Stats fetched",
      data: {
        byStatus,
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
        overdue: result?.overdue?.[0]?.n ?? 0,
        dueToday: result?.dueToday?.[0]?.n ?? 0,
        completedToday: result?.completedToday?.[0]?.n ?? 0,
      },
    };

    await redisUtil.set(cacheKey, JSON.stringify(payload), LIST_TTL);
    res.set("X-Cache", "MISS").status(200).json(payload);
  } catch (error) {
    serverError(res, "Get Stats Error", error);
  }
};

export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = TaskIdParams.safeParse(req.params);
    if (!params.success) return void badId(res);

    const { orgId } = req.user!;
    const { taskId } = params.data;
    const key = itemKey(orgId, taskId);

    const cached = await redisUtil.get(key);
    if (cached) {
      res.set("X-Cache", "HIT").status(200).json({ message: "Task fetched", data: JSON.parse(cached) });
      return;
    }

    const task = await Task.findOne({ _id: taskId, orgId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    await redisUtil.set(key, JSON.stringify(task), ITEM_TTL);
    res.set("X-Cache", "MISS").status(200).json({ message: "Task fetched", data: task });
  } catch (error) {
    serverError(res, "Get Task By ID Error", error);
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = TaskIdParams.safeParse(req.params);
    if (!params.success) return void badId(res);

    const parsed = UpdateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const { orgId } = req.user!;
    const { taskId } = params.data;
    const loaded = await loadForEdit(req, res, taskId);
    if (!loaded) return;

    const data = parsed.data;
    const $set: Record<string, unknown> = { ...data, ...deriveFields(data) };

    if (data.status !== undefined) {
      $set.completedAt =
        data.status === TaskStatus.COMPLETED ? (loaded.task.completedAt ?? new Date()) : null;
    }
    // A new reminder time must be delivered again by the notification service.
    if (data.reminderAt !== undefined) $set.reminderSentAt = null;

    const updated = await Task.findOneAndUpdate(
      { _id: taskId, orgId },
      { $set },
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    await invalidate(orgId, taskId);
    res.status(200).json({ message: "Task updated", data: updated });
  } catch (error) {
    serverError(res, "Update Task Error", error);
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = TaskIdParams.safeParse(req.params);
    if (!params.success) return void badId(res);

    const { orgId } = req.user!;
    const { taskId } = params.data;
    const loaded = await loadForEdit(req, res, taskId, canDelete);
    if (!loaded) return;

    await Task.deleteOne({ _id: taskId, orgId });
    await invalidate(orgId, taskId);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    serverError(res, "Delete Task Error", error);
  }
};

// ---------- subtasks ----------
export const addSubtask = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = TaskIdParams.safeParse(req.params);
    if (!params.success) return void badId(res);
    const parsed = CreateSubtaskSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const { orgId } = req.user!;
    const { taskId } = params.data;
    const loaded = await loadForEdit(req, res, taskId);
    if (!loaded) return;

    if (loaded.task.subtasks.length >= 50) {
      res.status(422).json({ message: "A task can have at most 50 subtasks" });
      return;
    }

    const updated = await Task.findOneAndUpdate(
      { _id: taskId, orgId },
      { $push: { subtasks: { title: parsed.data.title, isCompleted: false } } },
      { returnDocument: "after", runValidators: true }
    );

    await invalidate(orgId, taskId);
    res.status(201).json({ message: "Subtask added", data: updated });
  } catch (error) {
    serverError(res, "Add Subtask Error", error);
  }
};

export const updateSubtask = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = SubtaskParams.safeParse(req.params);
    if (!params.success) return void badId(res);
    const parsed = UpdateSubtaskSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const { orgId } = req.user!;
    const { taskId, subtaskId } = params.data;
    const loaded = await loadForEdit(req, res, taskId);
    if (!loaded) return;

    const $set: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) $set["subtasks.$.title"] = parsed.data.title;
    if (parsed.data.isCompleted !== undefined) $set["subtasks.$.isCompleted"] = parsed.data.isCompleted;

    const updated = await Task.findOneAndUpdate(
      { _id: taskId, orgId, "subtasks._id": subtaskId },
      { $set },
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) {
      res.status(404).json({ message: "Subtask not found" });
      return;
    }

    await invalidate(orgId, taskId);
    res.status(200).json({ message: "Subtask updated", data: updated });
  } catch (error) {
    serverError(res, "Update Subtask Error", error);
  }
};

export const deleteSubtask = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = SubtaskParams.safeParse(req.params);
    if (!params.success) return void badId(res);

    const { orgId } = req.user!;
    const { taskId, subtaskId } = params.data;
    const loaded = await loadForEdit(req, res, taskId);
    if (!loaded) return;

    const updated = await Task.findOneAndUpdate(
      { _id: taskId, orgId, "subtasks._id": subtaskId },
      { $pull: { subtasks: { _id: subtaskId } } },
      { returnDocument: "after" }
    );
    if (!updated) {
      res.status(404).json({ message: "Subtask not found" });
      return;
    }

    await invalidate(orgId, taskId);
    res.status(200).json({ message: "Subtask deleted", data: updated });
  } catch (error) {
    serverError(res, "Delete Subtask Error", error);
  }
};