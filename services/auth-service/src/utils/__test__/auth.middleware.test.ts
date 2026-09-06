import { describe, it, expect, vi, beforeEach } from "vitest";
import express from 'express';
import request from 'supertest';
import { authenticateUser } from '../../middlewares/auth.middleware';
import * as jwtUtils from '../../utils/jwt'; 
const app = express();
app.get("/api/protected-route", authenticateUser, (req, res) => {
    res.status(200).json({ 
        message: "Protected route accessed",
        user: req.user 
    });
});

describe("Auth Middleware", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return 401 when no authorization header is present", async () => {
        const res = await request(app).get("/api/protected-route");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    });

    it("should return 401 when authorization header does not start with 'Bearer '", async () => {
        const res = await request(app)
            .get("/api/protected-route")
            .set("Authorization", "InvalidToken");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    });

    it("should return 401 when token is invalid", async () => {
        // Mock verifyToken throwing an error to trigger 401 in middleware
        vi.spyOn(jwtUtils, "verifyToken").mockImplementationOnce(() => {
            throw new Error("Invalid token");
        });

        const res = await request(app)
            .get("/api/protected-route")
            .set("Authorization", "Bearer InvalidToken");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized");
    });

    it("should call next() and allow access when token is valid", async () => {
        const mockPayload = { userId: "123", email: "user@test.com" };

        // Spy on verifyToken and return valid payload for this specific test
        vi.spyOn(jwtUtils, "verifyToken").mockReturnValueOnce(mockPayload as any);

        const res = await request(app)
            .get("/api/protected-route")
            .set("Authorization", "Bearer ValidToken");

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Protected route accessed");
        expect(res.body.user).toEqual(mockPayload);
    });
});