import type { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

const JWKS_URI = process.env.JWKS_URI;

if (!JWKS_URI) {
  throw new Error("JWKS_URI is not set in environment");
}

// Caches keys in memory 
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

interface AccessTokenPayload extends JWTPayload {
  userId?: string;
  email?: string;
  orgId?: string;
  role?: string;
  type?: string;
}

const ROLES = new Set(["OWNER", "ADMIN", "MEMBER"]);

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: Token missing or invalid" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Unauthorized: Malformed token" });
    return;
  }

  try {
    const { payload } = await jwtVerify<AccessTokenPayload>(token, JWKS, {
      algorithms: ["RS256"]
    });

    if (
      payload.type !== "access" ||
      !payload.userId ||
      !payload.orgId ||
      !payload.role ||
      !ROLES.has(payload.role)
    ) {
      res.status(401).json({ message: "Unauthorized: Invalid token payload" });
      return;
    }

    req.user = {
      userId: payload.userId,
      orgId: payload.orgId,
      role: payload.role as "OWNER" | "ADMIN" | "MEMBER",
      ...(payload.email ? { email: payload.email } : {}),
    };
    next();
  } catch (error: any) {
    const code: string = error?.code ?? "";
    const invalidToken =
      code.startsWith("ERR_JWT") || code.startsWith("ERR_JWS") || code === "ERR_JWKS_NO_MATCHING_KEY";

    if (invalidToken) {
      res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
      return;
    }

    console.error("JWKS verification failed:", error?.message || error);
    res.status(503).json({ message: "Auth service unavailable, try again shortly" });
  }
};