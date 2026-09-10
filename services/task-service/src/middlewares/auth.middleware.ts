import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Unauthorized: Token missing or invalid"
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
    const JWT_SECRET = process.env.JWT_SECRET || "test_secret_key_123";

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
    if (!res.headersSent) {
      res.status(401).json({
        message: "Unauthorized: Invalid or expired token"
      });
    }
  }
};