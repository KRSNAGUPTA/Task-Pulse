import { Request } from "express";

export interface UserPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}