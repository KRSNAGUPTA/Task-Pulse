import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { prisma } from "../prisma";
import app from "../../index.js";
import * as passwordUtils from "../password.js";
import * as jwtUtils from "../jwt.js";

vi.mock("../prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        membership: {
            findUnique: vi.fn(),
        },
    },
}));

const membership = { orgId: "org-1", role: "OWNER" as const };

describe("Auth Controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe("POST /api/auth/register", () => {
        const name = "krishna";
        const email = "user@test.com";
        const password = "efjnxybxr76";

        it("should return 400 when email and password are missing", async () => {
            const res = await request(app).post("/api/auth/register").send({ name: "Krishna" });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Email and Password are required");
        });

        it("should return 400 when password is missing", async () => {
            const res = await request(app).post("/api/auth/register").send({ name, email });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Email and Password are required");
        });

        it("should return 400 when password is less than 8 characters", async () => {
            const res = await request(app).post("/api/auth/register").send({
                name: "Krishna",
                email,
                password: "dr3rc4",
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Password should be at least 8 characters");
        });

        it("should return 409 when user already exists", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "usr-1", email } as any);

            const res = await request(app).post("/api/auth/register").send({ name, email, password });

            expect(res.status).toBe(409);
            expect(res.body.message).toBe("User already exists, try logging in");
        });

        it("should return 409 when the unique constraint fires during a race", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
            vi.mocked(prisma.user.create).mockRejectedValueOnce({ code: "P2002" });

            const res = await request(app).post("/api/auth/register").send({ name, email, password });

            expect(res.status).toBe(409);
            expect(res.body.message).toBe("User already exists, try logging in");
        });

        it("should register a user with a personal org and OWNER membership", async () => {
            const created = {
                id: "3212",
                name,
                email,
                createdAt: new Date(),
                memberships: [membership],
            };
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
            vi.mocked(prisma.user.create).mockResolvedValueOnce(created as any);

            const res = await request(app).post("/api/auth/register").send({ name, email, password });

            expect(res.status).toBe(201);
            expect(res.body.user).toEqual({
                id: created.id,
                name,
                email,
                createdAt: expect.any(String),
            });
            expect(res.body.org).toEqual({ id: "org-1", role: "OWNER" });
            expect(res.body.token.accessToken).toBeDefined();

            const cookies = res.headers["set-cookie"] as unknown as string[];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain("RefreshToken=");
            expect(cookies[0]).toContain("HttpOnly");

            const arg = vi.mocked(prisma.user.create).mock.calls[0][0] as any;
            expect(arg.data.memberships.create.role).toBe("OWNER");
            expect(arg.data.memberships.create.org.create.slug).toMatch(/^krishna-[0-9a-f]{6}$/);
        });

        it("should lowercase and trim the email before saving", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
            vi.mocked(prisma.user.create).mockResolvedValueOnce({
                id: "1",
                name,
                email,
                createdAt: new Date(),
                memberships: [membership],
            } as any);

            await request(app).post("/api/auth/register").send({
                name,
                email: "  User@Test.COM ",
                password,
            });

            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "user@test.com" } });
            const arg = vi.mocked(prisma.user.create).mock.calls[0][0] as any;
            expect(arg.data.email).toBe("user@test.com");
        });

        it("access token should carry orgId, role and type", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
            vi.mocked(prisma.user.create).mockResolvedValueOnce({
                id: "1",
                name,
                email,
                createdAt: new Date(),
                memberships: [membership],
            } as any);

            const res = await request(app).post("/api/auth/register").send({ name, email, password });
            const decoded = jwtUtils.verifyToken(res.body.token.accessToken);

            expect(decoded).toMatchObject({ userId: "1", orgId: "org-1", role: "OWNER", type: "access" });
        });
    });

    describe("POST /api/auth/login", () => {
        const name = "Krishna";
        const email = "user@test.com";

        it("should return 400 when email and password are missing", async () => {
            const res = await request(app).post("/api/auth/login").send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch("Email and Password required");
        });

        it("should return 401 when the user does not exist", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
            const res = await request(app).post("/api/auth/login").send({ email, password: "whatever123" });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch("Invalid email or password");
        });

        it("should return 401 on wrong password", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "43",
                name,
                email,
                password: "hash",
                memberships: [membership],
            } as any);
            vi.spyOn(passwordUtils, "comparePassword").mockResolvedValueOnce(false);

            const res = await request(app).post("/api/auth/login").send({ email, password: "ef334f4d3" });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch("Invalid email or password");
        });

        it("should return 403 when the user has no workspace", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "43",
                name,
                email,
                password: "hash",
                memberships: [],
            } as any);
            vi.spyOn(passwordUtils, "comparePassword").mockResolvedValueOnce(true);

            const res = await request(app).post("/api/auth/login").send({ email, password: "ef334f4d3" });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Account has no workspace");
        });

        it("should login and return token, user and org", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "32323",
                name,
                email,
                password: "hash",
                memberships: [membership],
            } as any);
            vi.spyOn(passwordUtils, "comparePassword").mockResolvedValueOnce(true);

            const res = await request(app).post("/api/auth/login").send({ email, password: "correct-pass" });

            expect(res.status).toBe(200);
            expect(res.body.user).toMatchObject({ id: "32323", email });
            expect(res.body.user.password).toBeUndefined();
            expect(res.body.org).toEqual({ id: "org-1", role: "OWNER" });
            expect(res.body.token.accessToken).toBeDefined();

            const cookies = res.headers["set-cookie"] as unknown as string[];
            expect(cookies[0]).toContain("RefreshToken=");
            expect(cookies[0]).toContain("Path=/api/auth/refresh");
        });
    });

    describe("POST /api/auth/logout", () => {
        it("should clear the refresh cookie", async () => {
            const res = await request(app).post("/api/auth/logout");
            expect(res.status).toBe(200);
            expect(res.body.message).toMatch("User logout");

            const cookie = res.header["set-cookie"] as unknown as string[];
            expect(cookie).toBeDefined();
            expect(cookie[0]).toContain("RefreshToken=;");
        });
    });

    describe("POST /api/auth/refresh", () => {
        const refreshPayload = {
            userId: "32323",
            email: "user@test.com",
            orgId: "org-1",
            role: "OWNER" as const,
            type: "refresh" as const,
        };

        it("should return 401 when the refresh token is missing", async () => {
            const res = await request(app).post("/api/auth/refresh");
            expect(res.status).toBe(401);
            expect(res.body.message).toMatch("Refresh token missing");
        });

        it("should return 401 (not 500) when the refresh token is invalid", async () => {
            vi.spyOn(jwtUtils, "verifyToken").mockImplementationOnce(() => {
                throw new Error("Invalid token");
            });
            const res = await request(app).post("/api/auth/refresh").set("Cookie", "RefreshToken=invalidtoken");

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch("Invalid or expired refresh token");
        });

        it("should return 401 when an access token is sent as a refresh token", async () => {
            vi.spyOn(jwtUtils, "verifyToken").mockReturnValueOnce({ ...refreshPayload, type: "access" });
            const res = await request(app).post("/api/auth/refresh").set("Cookie", "RefreshToken=sometoken");

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Invalid token type");
        });

        it("should return 401 when the membership no longer exists", async () => {
            vi.spyOn(jwtUtils, "verifyToken").mockReturnValueOnce(refreshPayload);
            vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null);

            const res = await request(app).post("/api/auth/refresh").set("Cookie", "RefreshToken=validtoken");

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Session no longer valid");
        });

        it("should issue a new access token using the current role from the database", async () => {
            vi.spyOn(jwtUtils, "verifyToken").mockReturnValueOnce(refreshPayload);
            vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
                role: "ADMIN",
                user: { id: "32323", email: "user@test.com" },
            } as any);
            const genSpy = vi.spyOn(jwtUtils, "generateToken").mockReturnValueOnce("newaccesstoken");

            const res = await request(app).post("/api/auth/refresh").set("Cookie", "RefreshToken=validtoken");

            expect(res.status).toBe(200);
            expect(res.body.token.accessToken).toBe("newaccesstoken");
            expect(genSpy).toHaveBeenCalledWith(
                expect.objectContaining({ orgId: "org-1", role: "ADMIN", type: "access" }),
                "15m"
            );
        });
    });

    describe("GET /api/auth/me", () => {
        it("should return 401 without a token", async () => {
            const res = await request(app).get("/api/auth/me");
            expect(res.status).toBe(401);
        });

        it("should return the user with the list of orgs", async () => {
            vi.spyOn(jwtUtils, "verifyToken").mockReturnValueOnce({
                userId: "1",
                email: "user@test.com",
                orgId: "org-1",
                role: "OWNER",
                type: "access",
            });
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "1",
                name: "Krishna",
                email: "user@test.com",
                emailVerified: false,
                createdAt: new Date(),
                memberships: [{ role: "OWNER", org: { id: "org-1", name: "Krishna's workspace", slug: "krishna-abc123" } }],
            } as any);

            const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer token");

            expect(res.status).toBe(200);
            expect(res.body.activeOrgId).toBe("org-1");
            expect(res.body.orgs).toEqual([
                { id: "org-1", name: "Krishna's workspace", slug: "krishna-abc123", role: "OWNER" },
            ]);
            expect(res.body.user.password).toBeUndefined();
        });

        it("should return 404 when the user was deleted", async () => {
            vi.spyOn(jwtUtils, "verifyToken").mockReturnValueOnce({
                userId: "1",
                email: "user@test.com",
                orgId: "org-1",
                role: "OWNER",
                type: "access",
            });
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

            const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer token");
            expect(res.status).toBe(404);
        });
    });
});