import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../prisma";
import request from "supertest";
import app from "../../index.js";
import { hashPassword } from "../password";
import * as passwordUtils from "../password.js";

vi.mock("../prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

describe("Auth Controller - Register: Integration Test", () => {
    beforeEach(() => vi.clearAllMocks());

    describe("POST /api/auth/register", () => {
        const name = "krishna"
        const email = "user@test.com";
        const password = "efjnxybxr76";

        // 1. Missing email and pass
        it("should return email and pass missing when only name is sent", async () => {
            const res = await request(app).post("/api/auth/register").send({
                name: "Krishna",
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Email and Password are required");
        });

        // 2. Only email sent
        it("should return email and pass missing when pass is missing", async () => {
            const res = await request(app).post("/api/auth/register").send({
                name,
                email,
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Email and Password are required");
        });

        // 3. Short password
        it("should return 400 when password is less than 8 characters", async () => {
            const res = await request(app).post("/api/auth/register").send({
                name: "Krishna",
                email,
                password: "dr3rc4",
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Password should be at least 8 characters");
        });

        // 4. Duplicate User check
        it("should return 409 when user already exists", async () => {
            // Mock DB finding an existing user
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "usr-1",
                email,
            } as any);

            const res = await request(app).post("/api/auth/register").send({
                name,
                email,
                password,
            });

            expect(res.status).toBe(409);
            expect(res.body.message).toBe("User already exists, try logging in");
        });


        // 5. Successful Registration
        it("Should register a user", async () => {
            const payload = {
                id: "3212", name, email, createdAt: new Date()
            }
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
            vi.mocked(prisma.user.create).mockResolvedValueOnce(payload as any)
            const res = await request(app).post("/api/auth/register").send({
                name, email, password
            })
            expect(res.status).toBe(201)
            expect(res.body.user).toEqual({
                ...payload,
                createdAt: expect.any(String)
            })
            expect(res.body.token).toBeDefined();
            const cookies = res.headers["set-cookie"] as unknown as string[];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain("RefreshToken=");
        })
    });

    describe("POST /api/auth/login", () => {
        const name = "Krishna"
        const email = 'user@test.com'
        const password = 'fewfc4ct4tc'


        it("Email and password required", async () => {
            const res = await request(app).post("/api/auth/login").send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch("Email and Password required")
        })
        it("User dont exist", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
            const res = await request(app).post("/api/auth/login").send({
                email, password
            })

            expect(res.status).toBe(401)
            expect(res.body.message).toMatch('Invalid email or password')
        })
        it("wrong password", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "43",
                name,
                email,
                password:"fj84y747br667346b3"
            } as any)
            vi.spyOn(passwordUtils, "comparePassword").mockResolvedValueOnce(false);

            const res = await request(app).post("/api/auth/login").send({
                email,
                password: 'ef334f4d3'
            })
            expect(res.status).toBe(401)
            expect(res.body.message).toMatch("Invalid email or password")
        })

        // proper login
        it("Should Login", async () => {
            const payload = {
                user: {
                    id: '32323',
                    email,
                    password: '4g4g4vt54tg4t4'
                }
            }
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(payload.user as any);
            vi.spyOn(passwordUtils, "comparePassword").mockResolvedValueOnce(true)
            const res = await request(app).post("/api/auth/login").send({
                email:payload.user.email,
                password:payload.user.password
            })
            console.log(res.body)
            expect(res.status).toBe(200);
            expect(res.body.user).toMatchObject({
                id: payload.user.id,
                email: payload.user.email
            })
        })

    })
})
