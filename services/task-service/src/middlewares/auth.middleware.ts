import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  // console.log("Middle log")
  try {

    // console.log("In Auth Header")
    const authHeader = req.headers.authorization;
    
    console.log("Auth Header:", authHeader)
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Unauthorized: Token missing or invalid this"
      });
      return;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({
        message: "Unauthorized: Malformed token"
      });
      return;
    }

    // Fallback to a default secret if process.env.JWT_SECRET is unset in test runs
    const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
    if (!decoded || !decoded.userId) {
      res.status(401).json({
        message: "Unauthorized: Invalid token payload"
      });
      return;
    }

    req.user = { userId: decoded.userId };
    next();

  } catch (error: any) {
    console.log("Auth Middleware Error", error )
    if (!res.headersSent) {
      res.status(401).json({
        message: "Unauthorized: Invalid or expired token"
      });
    }
  }
};