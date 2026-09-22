import type { AuthUser } from "../types/express.js";

interface Ownable {
  createdBy: string;
  assigneeId?: string | null;
}

const isPrivileged = (user: AuthUser) => user.role === "OWNER" || user.role === "ADMIN";

/** OWNER / ADMIN can edit any task in the org; MEMBER only tasks they created or are assigned to. */
export const canEdit = (user: AuthUser, task: Ownable) =>
  isPrivileged(user) || task.createdBy === user.userId || task.assigneeId === user.userId;

/** Deleting is stricter: MEMBER can only delete what they created. */
export const canDelete = (user: AuthUser, task: Ownable) =>
  isPrivileged(user) || task.createdBy === user.userId;