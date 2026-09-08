import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    // 1. Verify Authorization Header format
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

    // 2. Verify Secret exists
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      res.status(500).json({
        message: "Internal Server Error"
      });
      return;
    }

    // 3. Verify JWT Payload
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
    if (!decoded || !decoded.userId) {
      res.status(401).json({
        message: "Unauthorized: Invalid token payload"
      });
      return;
    }

    // 4. Attach user context and proceed
    req.user = { userId: decoded.userId };
    next();

  } catch (error: any) {
    // Catch JWT verification errors (e.g., TokenExpiredError, JsonWebTokenError)
    // ONLY send a response if headers haven't already been sent
    if (!res.headersSent) {
      res.status(401).json({
        message: "Unauthorized: Invalid or expired token"
      });
    }
  }
};