import { TaskStatus } from "../models/task.model.js";
import type { ListQuery } from "../schemas/task.schema.js";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // ?+ ->&

export function buildListFilter(
  q: ListQuery,
  ctx: { orgId: string; userId: string; now: Date }
): Record<string, any> {
  const filter: Record<string, any> = { orgId: ctx.orgId };

  if (q.status) {
    filter.status = { $in: q.status };
  } else if (q.overdue) {
    filter.status = { $nin: [TaskStatus.COMPLETED, TaskStatus.ARCHIVED] };
  } else if (!q.includeArchived) {
    filter.status = { $ne: TaskStatus.ARCHIVED };
  }

  if (q.priority) filter.priority = { $in: q.priority };
  if (q.tag) filter.tags = q.tag;
  if (q.q) filter.title = { $regex: escapeRegex(q.q), $options: "i" };
  if (q.assignee) filter.assigneeId = q.assignee === "me" ? ctx.userId : q.assignee;

  const due: Record<string, Date> = {};
  if (q.dueAfter) due.$gte = q.dueAfter;
  if (q.dueBefore) due.$lte = q.dueBefore;
  if (q.overdue) due.$lt = ctx.now;
  if (Object.keys(due).length) filter.dueDate = due;

  return filter;
}

export function buildSort(sort: ListQuery["sort"]): Record<string, 1 | -1> {
  switch (sort) {
    case "dueDate":
      return { dueSort: 1, _id: 1 };
    case "priority":
      return { priorityRank: -1, dueSort: 1, _id: 1 };
    case "createdAt":
      return { createdAt: 1, _id: 1 };
    case "updatedAt":
      return { updatedAt: -1, _id: -1 };
    case "-createdAt":
    default:
      return { createdAt: -1, _id: -1 };
  }
}

/** Start/end of the caller's local day as UTC instants. tzOffset = Date#getTimezoneOffset(). */
export function dayBounds(now: Date, tzOffset: number): { start: Date; end: Date } {
  const localMs = now.getTime() - tzOffset * 60_000;
  const localMidnight = Math.floor(localMs / 86_400_000) * 86_400_000;
  const start = new Date(localMidnight + tzOffset * 60_000);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}