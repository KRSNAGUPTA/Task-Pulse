import type { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

const JWKS_URI = process.env.JWKS_URI;

if(!JWKS_URI){
  throw new Error("JWKS_URI is not set in environment")
}

// createRemoteJWKSet handles in-memory caching and automatic refetching on unknown 'kid'
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

interface CustomJwtPayload extends JWTPayload {
  userId: string;
  email: string;
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    // console.log("Auth Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Unauthorized: Token missing or invalid",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({
        message: "Unauthorized: Malformed token",
      });
      return;
    }

    // Verify token asynchronously against JWKS
    const { payload } = await jwtVerify<CustomJwtPayload>(token, JWKS);

    if (!payload || !payload.userId) {
      res.status(401).json({
        message: "Unauthorized: Invalid token payload",
      });
      return;
    }

    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (error: any) {
    console.log('checking cause');
    console.log("Auth Middleware Error:", error?.message || error);

    
    if(error?.cause) console.log('Error Cause:', error.cause)
    if (!res.headersSent) {
      res.status(401).json({
        message: "Unauthorized: Invalid or expired token",
      });
    }
  }
};