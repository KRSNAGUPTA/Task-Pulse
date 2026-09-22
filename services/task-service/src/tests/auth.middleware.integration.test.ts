import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";

vi.hoisted(() => {
  (process.env as Record<string, string>).JWKS_URI = "http://auth.test/.well-known/jwks.json";
});

let privateKey: CryptoKey; // real key
let otherPrivateKey: CryptoKey; //for mocking wrong key
let publicJwk: JWK;
let app: express.Express;

const basePayload = { userId: "u1", email: "u1@test.com", orgId: "org1", role: "OWNER", type: "access" };

const sign = (payload: Record<string, unknown>, key = privateKey, exp: string | number = "15m") =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherPrivateKey = (await generateKeyPair("RS256")).privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ keys: [publicJwk] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }))
  );

  const { authenticateUser } = await import("../middlewares/auth.middleware.js");
  app = express();
  app.get("/protected", authenticateUser, (req, res) => {
    res.status(200).json({ user: req.user });
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("task-service authenticateUser (real JWKS verification)", () => {
  it("401 without a header", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("401 for garbage", async () => {
    const res = await request(app).get("/protected").set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("accepts a valid access token and exposes org + role", async () => {
    const token = await sign(basePayload);
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ userId: "u1", email: "u1@test.com", orgId: "org1", role: "OWNER" });
  });

  it("rejects a refresh token used as an access token", async () => {
    const token = await sign({ ...basePayload, type: "refresh" });
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token without orgId", async () => {
    const { orgId: _o, ...rest } = basePayload;
    const token = await sign(rest);
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("rejects an unknown role", async () => {
    const token = await sign({ ...basePayload, role: "SUPERUSER" });
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with a different key", async () => {
    const token = await sign(basePayload, otherPrivateKey);
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const token = await sign(basePayload, privateKey, Math.floor(Date.now() / 1000) - 60);
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("returns 503 (not 401) when the JWKS endpoint is unreachable", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const { authenticateUser } = await import("../middlewares/auth.middleware.js");
    const failing = express();
    failing.get("/protected", authenticateUser, (_req, res) => void res.sendStatus(200));

    const token = await sign(basePayload);
    const res = await request(failing).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(503);
  });
});