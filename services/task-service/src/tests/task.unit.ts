import { describe, expect, it } from "vitest";
import {
  CreateTaskSchema,
  ListQuerySchema,
  StatsQuerySchema,
  TaskIdParams,
  UpdateSubtaskSchema,
  UpdateTaskSchema,
} from "../schemas/task.schema.js";
import { NO_DUE_DATE, TaskPriority, TaskStatus, deriveFields } from "../models/task.model.js";
import { buildListFilter, buildSort, dayBounds } from "../utility/taskQuery.js";
import { canDelete, canEdit } from "../utility/permissions.js";
import type { AuthUser } from "../types/express.js";

const ctx = { orgId: "org1", userId: "u1", now: new Date("2026-09-21T10:00:00.000Z") };
const listQuery = (raw: Record<string, unknown> = {}) => ListQuerySchema.parse(raw);

describe("CreateTaskSchema", () => {
  it("applies defaults", () => {
    const t = CreateTaskSchema.parse({ title: "  Write docs  " });
    expect(t).toMatchObject({
      title: "Write docs",
      status: TaskStatus.TO_DO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      reminderAt: null,
      assigneeId: null,
      tags: [],
      subtasks: [],
      description: "",
    });
  });

  it("rejects an empty or too long title", () => {
    expect(CreateTaskSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(CreateTaskSchema.safeParse({ title: "x".repeat(121) }).success).toBe(false);
  });

  it("normalises and dedupes tags", () => {
    const t = CreateTaskSchema.parse({ title: "a", tags: ["Work", " work ", "Home"] });
    expect(t.tags).toEqual(["work", "home"]);
  });

  it("coerces ISO date strings", () => {
    const t = CreateTaskSchema.parse({ title: "a", dueDate: "2026-10-01T00:00:00.000Z" });
    expect(t.dueDate).toBeInstanceOf(Date);
  });

  it("rejects the old mixed-case priority", () => {
    expect(CreateTaskSchema.safeParse({ title: "a", priority: "Low" }).success).toBe(false);
    expect(CreateTaskSchema.safeParse({ title: "a", priority: "LOW" }).success).toBe(true);
  });

  it("ignores client-supplied orgId / createdBy", () => {
    const t = CreateTaskSchema.parse({ title: "a", orgId: "evil", createdBy: "evil" }) as any;
    expect(t.orgId).toBeUndefined();
    expect(t.createdBy).toBeUndefined();
  });
});

describe("UpdateTaskSchema", () => {
  it("does not inject defaults", () => {
    expect(UpdateTaskSchema.parse({ title: "new" })).toEqual({ title: "new" });
  });

  it("requires at least one field", () => {
    expect(UpdateTaskSchema.safeParse({}).success).toBe(false);
  });

  it("allows clearing dates and assignee with null", () => {
    expect(UpdateTaskSchema.parse({ dueDate: null, reminderAt: null, assigneeId: null })).toEqual({
      dueDate: null,
      reminderAt: null,
      assigneeId: null,
    });
  });

  it("does not accept subtasks (they have their own endpoints)", () => {
    expect(UpdateTaskSchema.safeParse({ subtasks: [{ title: "x" }] }).success).toBe(false);
  });
});

describe("UpdateSubtaskSchema / params", () => {
  it("accepts a partial subtask update", () => {
    expect(UpdateSubtaskSchema.parse({ isCompleted: true })).toEqual({ isCompleted: true });
    expect(UpdateSubtaskSchema.safeParse({}).success).toBe(false);
  });

  it("validates object ids", () => {
    expect(TaskIdParams.safeParse({ taskId: "not-an-id" }).success).toBe(false);
    expect(TaskIdParams.safeParse({ taskId: "507f1f77bcf86cd799439011" }).success).toBe(true);
    expect(TaskIdParams.safeParse({ taskId: { $ne: null } }).success).toBe(false);
  });
});

describe("ListQuerySchema", () => {
  it("has sane defaults", () => {
    expect(listQuery()).toMatchObject({ page: 1, limit: 20, sort: "-createdAt", includeArchived: false });
  });

  it("parses csv and repeated params", () => {
    expect(listQuery({ status: "TO_DO,IN_PROGRESS" }).status).toEqual(["TO_DO", "IN_PROGRESS"]);
    expect(listQuery({ status: ["TO_DO", "COMPLETED"] }).status).toEqual(["TO_DO", "COMPLETED"]);
  });

  it("rejects unknown enum values and out of range paging", () => {
    expect(ListQuerySchema.safeParse({ status: "DONE" }).success).toBe(false);
    expect(ListQuerySchema.safeParse({ limit: "1000" }).success).toBe(false);
    expect(ListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(ListQuerySchema.safeParse({ sort: "password" }).success).toBe(false);
  });

  it("rejects object injection in query values", () => {
    expect(ListQuerySchema.safeParse({ q: { $ne: "" } }).success).toBe(false);
    expect(ListQuerySchema.safeParse({ tag: { $gt: "" } }).success).toBe(false);
  });

  it("parses booleans", () => {
    expect(listQuery({ overdue: "true", includeArchived: "true" })).toMatchObject({
      overdue: true,
      includeArchived: true,
    });
  });
});

describe("buildListFilter", () => {
  it("always scopes by org and hides archived by default", () => {
    expect(buildListFilter(listQuery(), ctx)).toEqual({
      orgId: "org1",
      status: { $ne: TaskStatus.ARCHIVED },
    });
  });

  it("includes archived when asked", () => {
    expect(buildListFilter(listQuery({ includeArchived: "true" }), ctx)).toEqual({ orgId: "org1" });
  });

  it("explicit status wins over the archived default", () => {
    expect(buildListFilter(listQuery({ status: "ARCHIVED" }), ctx).status).toEqual({ $in: ["ARCHIVED"] });
  });

  it("resolves assignee=me to the caller", () => {
    expect(buildListFilter(listQuery({ assignee: "me" }), ctx).assigneeId).toBe("u1");
    expect(buildListFilter(listQuery({ assignee: "u9" }), ctx).assigneeId).toBe("u9");
  });

  it("escapes regex characters in the search text", () => {
    const f = buildListFilter(listQuery({ q: "a.*(b)" }), ctx);
    expect(f.title.$regex).toBe("a\\.\\*\\(b\\)");
    expect(f.title.$options).toBe("i");
  });

  it("builds an overdue filter", () => {
    const f = buildListFilter(listQuery({ overdue: "true" }), ctx);
    expect(f.dueDate).toEqual({ $lt: ctx.now });
    expect(f.status).toEqual({ $nin: [TaskStatus.COMPLETED, TaskStatus.ARCHIVED] });
  });

  it("builds a due date range", () => {
    const f = buildListFilter(
      listQuery({ dueAfter: "2026-09-01T00:00:00Z", dueBefore: "2026-09-30T00:00:00Z" }),
      ctx
    );
    expect(f.dueDate.$gte).toEqual(new Date("2026-09-01T00:00:00Z"));
    expect(f.dueDate.$lte).toEqual(new Date("2026-09-30T00:00:00Z"));
  });
});

describe("buildSort", () => {
  it("sorts due date ascending on the derived field, ties broken by id", () => {
    expect(buildSort("dueDate")).toEqual({ dueSort: 1, _id: 1 });
  });
  it("sorts priority highest first", () => {
    expect(buildSort("priority")).toEqual({ priorityRank: -1, dueSort: 1, _id: 1 });
  });
  it("defaults to newest first", () => {
    expect(buildSort("-createdAt")).toEqual({ createdAt: -1, _id: -1 });
  });
});

describe("deriveFields", () => {
  it("ranks priority", () => {
    expect(deriveFields({ priority: TaskPriority.URGENT })).toEqual({ priorityRank: 3 });
    expect(deriveFields({ priority: TaskPriority.LOW })).toEqual({ priorityRank: 0 });
  });

  it("puts tasks without a due date last", () => {
    const due = new Date("2026-10-01T00:00:00Z");
    expect(deriveFields({ dueDate: due })).toEqual({ dueSort: due });
    expect(deriveFields({ dueDate: null })).toEqual({ dueSort: NO_DUE_DATE });
  });

  it("does not touch fields that were not provided", () => {
    expect(deriveFields({})).toEqual({});
  });
});

describe("dayBounds", () => {
  it("returns the UTC day when offset is 0", () => {
    const { start, end } = dayBounds(new Date("2026-09-21T10:00:00Z"), 0);
    expect(start.toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-22T00:00:00.000Z");
  });

  it("uses the caller's local day (IST, offset -330)", () => {
    // 2026-09-21 20:00 UTC is already 01:30 on the 22nd in India.
    const { start, end } = dayBounds(new Date("2026-09-21T20:00:00Z"), -330);
    expect(start.toISOString()).toBe("2026-09-21T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-22T18:30:00.000Z");
  });

  it("handles western offsets (New York EDT, offset 240)", () => {
    const { start } = dayBounds(new Date("2026-09-21T02:00:00Z"), 240);
    expect(start.toISOString()).toBe("2026-09-20T04:00:00.000Z");
  });

  it("validates tzOffset", () => {
    expect(StatsQuerySchema.safeParse({ tzOffset: "-330" }).data?.tzOffset).toBe(-330);
    expect(StatsQuerySchema.safeParse({ tzOffset: "9999" }).success).toBe(false);
  });
});

describe("permissions", () => {
  const owner: AuthUser = { userId: "o", orgId: "org1", role: "OWNER" };
  const admin: AuthUser = { userId: "a", orgId: "org1", role: "ADMIN" };
  const member: AuthUser = { userId: "m", orgId: "org1", role: "MEMBER" };

  it("lets OWNER and ADMIN edit and delete anything", () => {
    const task = { createdBy: "someone", assigneeId: null };
    for (const u of [owner, admin]) {
      expect(canEdit(u, task)).toBe(true);
      expect(canDelete(u, task)).toBe(true);
    }
  });

  it("lets a MEMBER edit tasks they created or are assigned to", () => {
    expect(canEdit(member, { createdBy: "m" })).toBe(true);
    expect(canEdit(member, { createdBy: "x", assigneeId: "m" })).toBe(true);
    expect(canEdit(member, { createdBy: "x", assigneeId: "y" })).toBe(false);
  });

  it("only lets a MEMBER delete what they created", () => {
    expect(canDelete(member, { createdBy: "m" })).toBe(true);
    expect(canDelete(member, { createdBy: "x", assigneeId: "m" })).toBe(false);
  });
});