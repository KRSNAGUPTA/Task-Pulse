import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { generateToken, verifyToken, type Role } from "../utils/jwt.js";

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const refreshCookieOptions = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/api/auth/refresh",
};

const normalizeEmail = (v: unknown) =>
  typeof v === "string" ? v.trim().toLowerCase() : "";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "workspace";

const makeSlug = (base: string) => `${slugify(base)}-${randomBytes(3).toString("hex")}`;

function issueTokens(
  res: Response,
  user: { id: string; email: string },
  membership: { orgId: string; role: Role }
) {
  const base = {
    userId: user.id,
    email: user.email,
    orgId: membership.orgId,
    role: membership.role,
  };
  const accessToken = generateToken({ ...base, type: "access" }, "15m");
  const refreshToken = generateToken({ ...base, type: "refresh" }, "7d");

  res.cookie("RefreshToken", refreshToken, {
    ...refreshCookieOptions,
    maxAge: REFRESH_MAX_AGE_MS,
  });
  return accessToken;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body || {};

    const cleanEmail = normalizeEmail(email);
    const cleanPassword = typeof password === "string" ? password.trim() : "";
    const cleanName = typeof name === "string" && name.trim() ? name.trim() : undefined;

    if (!cleanEmail || !cleanPassword) {
      res.status(400).json({ message: "Email and Password are required" });
      return;
    }
    if (cleanPassword.length < 8) {
      res.status(400).json({ message: "Password should be at least 8 characters" });
      return;
    }

    const alreadyUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (alreadyUser) {
      res.status(409).json({ message: "User already exists, try logging in" });
      return;
    }

    const hashedPass = await hashPassword(cleanPassword);


    // transaction write -> either complete or fail 
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPass,
        memberships: {
          create: {
            role: "OWNER",
            org: {
              create: {
                name: cleanName ? `${cleanName}'s workspace` : "Personal workspace",
                slug: makeSlug(cleanName ?? cleanEmail.split("@")[0]),
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        memberships: { select: { orgId: true, role: true } },
      },
    });

    const membership = user.memberships[0];
    const accessToken = issueTokens(res, user, membership);

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      org: { id: membership.orgId, role: membership.role },
      token: { accessToken },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ message: "User already exists, try logging in" });
      return;
    }
    console.error("Error while registering user:", error?.message || error);
    res.status(500).json({ message: "Internal server error during registration" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = typeof password === "string" ? password.trim() : "";

    if (!cleanEmail || !cleanPassword) {
      res.status(400).json({ message: "Email and Password required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { memberships: { select: { orgId: true, role: true }, take: 1 } },
    });

    if (!user || !(await comparePassword(cleanPassword, user.password))) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const membership = user.memberships[0];
    if (!membership) {
      res.status(403).json({ message: "Account has no workspace" });
      return;
    }

    const accessToken = issueTokens(res, user, membership);

    res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email },
      org: { id: membership.orgId, role: membership.role },
      token: { accessToken },
    });
  } catch (error: any) {
    console.error("Error while login", error?.message || error);
    res.status(500).json({ message: "Internal server error during login" });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie("RefreshToken", refreshCookieOptions);
  res.status(200).json({ message: "User logout" });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.RefreshToken;
  if (!refreshToken) {
    res.status(401).json({ message: "Refresh token missing" });
    return;
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
    return;
  }

  if (decoded.type !== "refresh") {
    res.status(401).json({ message: "Invalid token type" });
    return;
  }

  try {
    const membership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: decoded.userId, orgId: decoded.orgId } },
      select: { role: true, user: { select: { id: true, email: true } } },
    });

    if (!membership) {
      res.status(401).json({ message: "Session no longer valid" });
      return;
    }

    const accessToken = generateToken(
      {
        userId: membership.user.id,
        email: membership.user.email,
        orgId: decoded.orgId,
        role: membership.role,
        type: "access",
      },
      "15m"
    );
    res.status(200).json({ token: { accessToken } });
  } catch (error: any) {
    console.error("Error while refreshing token", error?.message || error);
    res.status(500).json({ message: "Internal server error during token refresh" });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const auth = req.user;
    if (!auth) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        memberships: {
          select: { role: true, org: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      activeOrgId: auth.orgId,
      orgs: user.memberships.map((m) => ({ ...m.org, role: m.role })),
    });
  } catch (error: any) {
    console.error("Error in /me", error?.message || error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}