import type { Request } from "express";

export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

export interface AuthUser {
  userId: string;
  email?: string;
  orgId: string;
  role: OrgRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}