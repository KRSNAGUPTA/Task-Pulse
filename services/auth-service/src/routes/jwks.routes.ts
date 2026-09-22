import { NextFunction, Request, Response, Router } from "express";
import { createPublicKey } from "node:crypto";
import { PUBLIC_KEY_PEM } from "../utils/jwt.js";

const KEY_ID = process.env.JWT_KEY_ID || "task-pulse-key-1";
const JWKS_PATH = "/.well-known/jwks.json";

type Jwks = { keys: object[] };

let jwksPromise: Promise<Jwks> | null = null;

function buildJwks(): Jwks {
  // Same key jwt.ts signs with (dev fallback included), so a token this service
  // issues always verifies against what this endpoint publishes.
  const jwk = createPublicKey(PUBLIC_KEY_PEM).export({ format: "jwk" });

  return {
    keys: [{ ...jwk, kid: KEY_ID, use: "sig", alg: "RS256" }],
  };
}

function getJwks(): Promise<Jwks> {
  if (!jwksPromise) {
    jwksPromise = Promise.resolve()
      .then(buildJwks)
      .catch((err) => {
        jwksPromise = null;
        throw err;
      });
  }
  return jwksPromise;
}

function corsHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.header("Access-Control-Request-Headers") || "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}

const router = Router();

router.use(JWKS_PATH, corsHeaders);

router.options(JWKS_PATH, (_req: Request, res: Response) => {
  res.status(204).end();
});

router.get(JWKS_PATH, async (_req: Request, res: Response) => {
  try {
    const jwks = await getJwks();
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("application/json").json(jwks);
  } catch (error: any) {
    console.error("Failed to serve JWKS:", error?.message || error);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;