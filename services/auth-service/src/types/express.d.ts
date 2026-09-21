import { Request } from "express";

export interface UserPayload {
  userId: string;
  email: string;
  orgId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}