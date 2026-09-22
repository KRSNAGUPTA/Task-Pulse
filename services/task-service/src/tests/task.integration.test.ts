import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Request, Response, NextFunction } from "express";

vi.hoisted(() => {
  (process.env as Record<string, string>).JWKS_URI = "http://mock.com";
});

// Test tokens -> identities. Two orgs, and a MEMBER + ADMIN inside org 1.
const USERS: Record<string, { userId: string; email: string; orgId: string; role: "OWNER" | "ADMIN" | "MEMBER" }> = {
  a_owner: { userId: "user_A", email: "a@example.com", orgId: "org_1", role: "OWNER" },
  a_admin: { userId: "user_ADMIN", email: "admin@example.com", orgId: "org_1", role: "ADMIN" },
  a_member: { userId: "user_MEMBER", email: "m@example.com", orgId: "org_1", role: "MEMBER" },
  b_owner: { userId: "user_B", email: "b@example.com", orgId: "org_2", role: "OWNER" },
};

vi.mock("../middlewares/auth.middleware.ts", () => ({
  authenticateUser: (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: Token missing or invalid" });
      return;
    }
    const user = USERS[header.split(" ")[1] ?? ""];
    if (!user) {
      res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
      return;
    }
    req.user = user;
    next();
  },
}));

// In-memory stand-in for Redis so cache behaviour (versioned invalidation) is really exercised.
vi.mock("../utility/redisUtility.ts", () => {
  const store = new Map<string, string>();
  return {
    redisUtil: {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      set: vi.fn(async (k: string, v: string) => void store.set(k, v)),
      del: vi.fn(async (...keys: string[]) => void keys.forEach((k) => store.delete(k))),
      incr: vi.fn(async (k: string) => {
        const n = Number(store.get(k) ?? 0) + 1;
        store.set(k, String(n));
        return n;
      }),
      getVersion: vi.fn(async (k: string) => Number(store.get(k) ?? 0)),
      __store: store,
    },
  };
});

import app from "../app.js";
import { Task, TaskPriority, TaskStatus } from "../models/task.model.js";
import { redisUtil } from "../utility/redisUtility.js";

let mongoServer: MongoMemoryServer | null = null;

const A = "Bearer a_owner";
const ADMIN = "Bearer a_admin";
const MEMBER = "Bearer a_member";
const B = "Bearer b_owner";

const create = (auth: string, body: Record<string, unknown>) =>
  request(app).post("/api/task").set("Authorization", auth).send(body);

beforeAll(async () => {
  // TEST_MONGO_URI lets CI / sandboxes without a downloadable mongod point at any Mongo-compatible server.
  const uri = process.env.TEST_MONGO_URI ?? (mongoServer = await MongoMemoryServer.create()).getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

beforeEach(async () => {
  await Task.deleteMany({});
  (redisUtil as any).__store.clear();
  vi.clearAllMocks();
});

describe("auth", () => {
  it("401 without a token", async () => {
    const res = await request(app).post("/api/task").send({ title: "x" });
    expect(res.status).toBe(401);
  });

  it("health check is public", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/task", () => {
  it("creates a task scoped to the caller's org", async () => {
    const res = await create(A, { title: "Ship it" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "Ship it",
      orgId: "org_1",
      createdBy: "user_A",
      status: TaskStatus.TO_DO,
      priority: TaskPriority.MEDIUM,
      assigneeId: null,
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data._id).toBeUndefined();
    expect(res.body.data.__v).toBeUndefined();
    expect(res.body.data.priorityRank).toBeUndefined();
  });

  it("ignores a client supplied orgId / createdBy", async () => {
    const res = await create(A, { title: "x", orgId: "org_2", createdBy: "someone" });
    expect(res.body.data.orgId).toBe("org_1");
    expect(res.body.data.createdBy).toBe("user_A");
  });

  it("422 on invalid body", async () => {
    const res = await create(A, { title: "" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it("400 on malformed JSON", async () => {
    const res = await request(app)
      .post("/api/task")
      .set("Authorization", A)
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
  });

  it("sets completedAt when created as COMPLETED", async () => {
    const res = await create(A, { title: "done", status: "COMPLETED" });
    expect(res.body.data.completedAt).toBeTruthy();
  });
});

describe("GET /api/task (org isolation, filters, pagination)", () => {
  it("only returns tasks from the caller's org", async () => {
    await create(A, { title: "Org1 task" });
    await create(B, { title: "Org2 task" });

    const res = await request(app).get("/api/task").set("Authorization", A);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Org1 task");
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  });

  it("shares tasks between members of the same org", async () => {
    await create(A, { title: "shared" });
    const res = await request(app).get("/api/task").set("Authorization", MEMBER);
    expect(res.body.data).toHaveLength(1);
  });

  it("paginates", async () => {
    for (let i = 1; i <= 5; i++) await create(A, { title: `t${i}` });
    const p1 = await request(app).get("/api/task?limit=2&page=1").set("Authorization", A);
    const p3 = await request(app).get("/api/task?limit=2&page=3").set("Authorization", A);
    expect(p1.body.data).toHaveLength(2);
    expect(p1.body.meta).toMatchObject({ total: 5, totalPages: 3 });
    expect(p3.body.data).toHaveLength(1);
    expect(p1.body.data[0].title).toBe("t5"); // newest first
  });

  it("filters by status, priority, tag and search text", async () => {
    await create(A, { title: "Fix login bug", priority: "URGENT", tags: ["bug"], status: "IN_PROGRESS" });
    await create(A, { title: "Write docs", priority: "LOW", tags: ["docs"] });
    await create(A, { title: "Login page design", priority: "HIGH", tags: ["design"] });

    const get = async (qs: string) =>
      (await request(app).get(`/api/task?${qs}`).set("Authorization", A)).body.data.map((t: any) => t.title);

    expect(await get("status=IN_PROGRESS")).toEqual(["Fix login bug"]);
    expect(await get("priority=URGENT,HIGH")).toHaveLength(2);
    expect(await get("tag=docs")).toEqual(["Write docs"]);
    expect(await get("q=login")).toHaveLength(2);
    expect(await get("q=.*")).toEqual([]); // regex characters are escaped
  });

  it("hides archived by default and shows them on request", async () => {
    await create(A, { title: "old", status: "ARCHIVED" });
    await create(A, { title: "new" });
    const hidden = await request(app).get("/api/task").set("Authorization", A);
    const shown = await request(app).get("/api/task?includeArchived=true").set("Authorization", A);
    expect(hidden.body.data).toHaveLength(1);
    expect(shown.body.data).toHaveLength(2);
  });

  it("assignee=me returns only tasks assigned to the caller", async () => {
    await create(A, { title: "mine", assigneeId: "user_A" });
    await create(A, { title: "theirs", assigneeId: "user_MEMBER" });
    const res = await request(app).get("/api/task?assignee=me").set("Authorization", A);
    expect(res.body.data.map((t: any) => t.title)).toEqual(["mine"]);
  });

  it("sorts by due date with undated tasks last", async () => {
    await create(A, { title: "no date" });
    await create(A, { title: "later", dueDate: "2027-01-01T00:00:00Z" });
    await create(A, { title: "sooner", dueDate: "2026-10-01T00:00:00Z" });
    const res = await request(app).get("/api/task?sort=dueDate").set("Authorization", A);
    expect(res.body.data.map((t: any) => t.title)).toEqual(["sooner", "later", "no date"]);
  });

  it("sorts by priority, highest first", async () => {
    await create(A, { title: "low", priority: "LOW" });
    await create(A, { title: "urgent", priority: "URGENT" });
    await create(A, { title: "high", priority: "HIGH" });
    const res = await request(app).get("/api/task?sort=priority").set("Authorization", A);
    expect(res.body.data.map((t: any) => t.title)).toEqual(["urgent", "high", "low"]);
  });

  it("finds overdue open tasks only", async () => {
    await create(A, { title: "late", dueDate: "2020-01-01T00:00:00Z" });
    await create(A, { title: "late but done", dueDate: "2020-01-01T00:00:00Z", status: "COMPLETED" });
    await create(A, { title: "future", dueDate: "2999-01-01T00:00:00Z" });
    const res = await request(app).get("/api/task?overdue=true").set("Authorization", A);
    expect(res.body.data.map((t: any) => t.title)).toEqual(["late"]);
  });

  it("422 on bad query params", async () => {
    const res = await request(app).get("/api/task?limit=5000").set("Authorization", A);
    expect(res.status).toBe(422);
  });

  it("serves repeat requests from cache and invalidates on write", async () => {
    await create(A, { title: "one" });
    const first = await request(app).get("/api/task").set("Authorization", A);
    const second = await request(app).get("/api/task").set("Authorization", A);
    expect(first.headers["x-cache"]).toBe("MISS");
    expect(second.headers["x-cache"]).toBe("HIT");

    await create(A, { title: "two" });
    const third = await request(app).get("/api/task").set("Authorization", A);
    expect(third.headers["x-cache"]).toBe("MISS");
    expect(third.body.data).toHaveLength(2);
  });

  it("never serves one org's cached list to another org", async () => {
    await create(A, { title: "org1 only" });
    await request(app).get("/api/task").set("Authorization", A);
    const res = await request(app).get("/api/task").set("Authorization", B);
    expect(res.body.data).toEqual([]);
  });
});

describe("GET /api/task/:taskId", () => {
  it("returns a task, from cache the second time", async () => {
    const { body } = await create(A, { title: "x" });
    const id = body.data.id;
    const r1 = await request(app).get(`/api/task/${id}`).set("Authorization", A);
    const r2 = await request(app).get(`/api/task/${id}`).set("Authorization", A);
    expect(r1.status).toBe(200);
    expect(r1.headers["x-cache"]).toBe("MISS");
    expect(r2.headers["x-cache"]).toBe("HIT");
    expect(r2.body.data.title).toBe("x");
  });

  it("404 for another org's task", async () => {
    const { body } = await create(A, { title: "secret" });
    const res = await request(app).get(`/api/task/${body.data.id}`).set("Authorization", B);
    expect(res.status).toBe(404);
  });

  it("400 for a malformed id", async () => {
    const res = await request(app).get("/api/task/not-an-id").set("Authorization", A);
    expect(res.status).toBe(400);
  });

  it("404 for a well-formed unknown id", async () => {
    const res = await request(app).get("/api/task/507f1f77bcf86cd799439011").set("Authorization", A);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/task/:taskId", () => {
  it("updates only the provided fields", async () => {
    const { body } = await create(A, { title: "old", tags: ["keep"], priority: "HIGH", description: "desc" });
    const res = await request(app)
      .patch(`/api/task/${body.data.id}`)
      .set("Authorization", A)
      .send({ title: "new" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: "new", tags: ["keep"], priority: "HIGH", description: "desc" });
  });

  it("sets and clears completedAt as the status changes", async () => {
    const { body } = await create(A, { title: "x" });
    const id = body.data.id;
    const done = await request(app).patch(`/api/task/${id}`).set("Authorization", A).send({ status: "COMPLETED" });
    expect(done.body.data.completedAt).toBeTruthy();
    const reopened = await request(app).patch(`/api/task/${id}`).set("Authorization", A).send({ status: "TO_DO" });
    expect(reopened.body.data.completedAt).toBeNull();
  });

  it("resets reminderSentAt when the reminder time changes", async () => {
    const { body } = await create(A, { title: "x", reminderAt: "2026-10-01T09:00:00Z" });
    await Task.updateOne({ _id: body.data.id }, { reminderSentAt: new Date() });
    const res = await request(app)
      .patch(`/api/task/${body.data.id}`)
      .set("Authorization", A)
      .send({ reminderAt: "2026-10-02T09:00:00Z" });
    expect(res.body.data.reminderSentAt).toBeNull();
  });

  it("invalidates the cached task and lists", async () => {
    const { body } = await create(A, { title: "before" });
    const id = body.data.id;
    await request(app).get(`/api/task/${id}`).set("Authorization", A);
    await request(app).get("/api/task").set("Authorization", A);

    await request(app).patch(`/api/task/${id}`).set("Authorization", A).send({ title: "after" });

    const one = await request(app).get(`/api/task/${id}`).set("Authorization", A);
    const list = await request(app).get("/api/task").set("Authorization", A);
    expect(one.body.data.title).toBe("after");
    expect(list.body.data[0].title).toBe("after");
  });

  it("cannot modify another org's task", async () => {
    const { body } = await create(A, { title: "mine" });
    const res = await request(app).patch(`/api/task/${body.data.id}`).set("Authorization", B).send({ title: "hacked" });
    expect(res.status).toBe(404);
    expect((await Task.findById(body.data.id))?.title).toBe("mine");
  });

  it("422 when the body is empty", async () => {
    const { body } = await create(A, { title: "x" });
    const res = await request(app).patch(`/api/task/${body.data.id}`).set("Authorization", A).send({});
    expect(res.status).toBe(422);
  });
});

describe("roles", () => {
  it("a MEMBER cannot edit or delete someone else's task", async () => {
    const { body } = await create(A, { title: "owner's" });
    const patch = await request(app).patch(`/api/task/${body.data.id}`).set("Authorization", MEMBER).send({ title: "x" });
    const del = await request(app).delete(`/api/task/${body.data.id}`).set("Authorization", MEMBER);
    expect(patch.status).toBe(403);
    expect(del.status).toBe(403);
  });

  it("a MEMBER can edit a task assigned to them but not delete it", async () => {
    const { body } = await create(A, { title: "assigned", assigneeId: "user_MEMBER" });
    const patch = await request(app).patch(`/api/task/${body.data.id}`).set("Authorization", MEMBER).send({ status: "IN_PROGRESS" });
    const del = await request(app).delete(`/api/task/${body.data.id}`).set("Authorization", MEMBER);
    expect(patch.status).toBe(200);
    expect(del.status).toBe(403);
  });

  it("a MEMBER can delete their own task", async () => {
    const { body } = await create(MEMBER, { title: "own" });
    const del = await request(app).delete(`/api/task/${body.data.id}`).set("Authorization", MEMBER);
    expect(del.status).toBe(200);
  });

  it("an ADMIN can edit and delete anything in the org", async () => {
    const { body } = await create(MEMBER, { title: "member's" });
    const patch = await request(app).patch(`/api/task/${body.data.id}`).set("Authorization", ADMIN).send({ title: "edited" });
    const del = await request(app).delete(`/api/task/${body.data.id}`).set("Authorization", ADMIN);
    expect(patch.status).toBe(200);
    expect(del.status).toBe(200);
  });
});

describe("DELETE /api/task/:taskId", () => {
  it("deletes and evicts caches", async () => {
    const { body } = await create(A, { title: "bye" });
    const id = body.data.id;
    await request(app).get(`/api/task/${id}`).set("Authorization", A);

    const del = await request(app).delete(`/api/task/${id}`).set("Authorization", A);
    expect(del.status).toBe(200);
    expect((await request(app).get(`/api/task/${id}`).set("Authorization", A)).status).toBe(404);
    expect((await request(app).get("/api/task").set("Authorization", A)).body.data).toEqual([]);
  });

  it("404 when deleting another org's task", async () => {
    const { body } = await create(A, { title: "keep" });
    const res = await request(app).delete(`/api/task/${body.data.id}`).set("Authorization", B);
    expect(res.status).toBe(404);
    expect(await Task.countDocuments({})).toBe(1);
  });
});

describe("subtasks", () => {
  it("adds, toggles, renames and deletes a subtask", async () => {
    const { body } = await create(A, { title: "parent" });
    const id = body.data.id;

    const added = await request(app).post(`/api/task/${id}/subtasks`).set("Authorization", A).send({ title: "step 1" });
    expect(added.status).toBe(201);
    expect(added.body.data.subtasks).toHaveLength(1);
    const sub = added.body.data.subtasks[0];
    expect(sub).toMatchObject({ title: "step 1", isCompleted: false });
    expect(sub.id).toBeDefined();

    const toggled = await request(app)
      .patch(`/api/task/${id}/subtasks/${sub.id}`)
      .set("Authorization", A)
      .send({ isCompleted: true });
    expect(toggled.body.data.subtasks[0].isCompleted).toBe(true);

    const renamed = await request(app)
      .patch(`/api/task/${id}/subtasks/${sub.id}`)
      .set("Authorization", A)
      .send({ title: "step one" });
    expect(renamed.body.data.subtasks[0]).toMatchObject({ title: "step one", isCompleted: true });

    const removed = await request(app).delete(`/api/task/${id}/subtasks/${sub.id}`).set("Authorization", A);
    expect(removed.status).toBe(200);
    expect(removed.body.data.subtasks).toHaveLength(0);
  });

  it("404 for an unknown subtask", async () => {
    const { body } = await create(A, { title: "parent" });
    const res = await request(app)
      .patch(`/api/task/${body.data.id}/subtasks/507f1f77bcf86cd799439011`)
      .set("Authorization", A)
      .send({ isCompleted: true });
    expect(res.status).toBe(404);
  });

  it("cannot touch another org's subtasks", async () => {
    const { body } = await create(A, { title: "parent", subtasks: [{ title: "s" }] });
    const sub = body.data.subtasks[0];
    const res = await request(app)
      .patch(`/api/task/${body.data.id}/subtasks/${sub.id}`)
      .set("Authorization", B)
      .send({ isCompleted: true });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/task/stats", () => {
  it("counts by status, overdue and due today", async () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await create(A, { title: "todo" });
    await create(A, { title: "wip", status: "IN_PROGRESS" });
    await create(A, { title: "done", status: "COMPLETED" });
    await create(A, { title: "late", dueDate: "2020-01-01T00:00:00Z" });
    await create(A, { title: "today", dueDate: soon });
    await create(B, { title: "other org" });

    const res = await request(app).get("/api/task/stats").set("Authorization", A);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.byStatus).toMatchObject({ TO_DO: 3, IN_PROGRESS: 1, COMPLETED: 1, ARCHIVED: 0 });
    expect(res.body.data.overdue).toBe(1);
    expect(res.body.data.completedToday).toBe(1);
  });

  it("is not shadowed by /:taskId", async () => {
    const res = await request(app).get("/api/task/stats").set("Authorization", A);
    expect(res.status).toBe(200);
  });
});