import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { randomBytes } from "node:crypto";

// NFKD: Normalization Form: Compatibility Decomposition in Unicode
// NFKD breaks down Unicode characters into their base components and replaces stylistic variants (like ligatures or superscripts) with standard letters.

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "workspace";

const makeSlug = (base: string) => `${slugify(base)}-${randomBytes(3).toString("hex")}`;

export const createOrg = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ message: "Organization name is required" });
      return;
    }

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: makeSlug(name),
        memberships: {
          create: {
            userId: user.userId,
            role: "OWNER",
          },
        },
      },
      include: { memberships: true },
    });

    res.status(201).json({ message: "Organization created", data: org });
  } catch (error: any) {
    console.error("Create Org Error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrgMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    const { orgId } = req.params as {orgId: string};

    const membership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: user.userId, orgId } },
    });

    if (!membership) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const members = await prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(200).json({ 
      data: members.map((m) => ({ 
        id: m.user.id, 
        name: m.user.name, 
        email: m.user.email, 
        role: m.role 
      })) 
    });
  } catch (error: any) {
    console.error("Get Members Error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add a Member to an Organization (by Email)
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    const { orgId } = req.params as {orgId: string};
    const { email, role } = req.body;

    const requesterMembership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: user.userId, orgId } },
    });

    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      res.status(403).json({ message: "Only Owners or Admins can add members" });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!targetUser) {
      res.status(404).json({ message: "User not found with this email" });
      return;
    }

    const existingMembership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: targetUser.id, orgId } },
    });

    if (existingMembership) {
      res.status(409).json({ message: "User is already a member of this organization" });
      return;
    }

    const newMembership = await prisma.membership.create({
      data: {
        userId: targetUser.id,
        orgId,
        role: role || "MEMBER",
      },
    });

    res.status(201).json({ message: "Member added successfully", data: newMembership });
  } catch (error: any) {
    console.error("Add Member Error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};