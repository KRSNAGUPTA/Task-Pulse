import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken, verifyToken, type PayLoad } from "../jwt";

const payLoad: PayLoad = {
    userId: "1763236",
    email: "user@test.com",
    orgId: "org-1",
    role: "OWNER",
    type: "access",
};

describe("Test JWT", () => {
    it("signs and verifies a token with org claims", () => {
        const token = generateToken(payLoad, 60 * 15);
        expect(verifyToken(token)).toMatchObject(payLoad);
    });

    it("signs with RS256 and a key id", () => {
        const token = generateToken(payLoad, "15m");
        const decoded = jwt.decode(token, { complete: true }) as any;
        expect(decoded.header.alg).toBe("RS256");
        expect(decoded.header.kid).toBeDefined();
    });

    it("throws on an expired token", () => {
        const token = generateToken(payLoad, -10);
        expect(() => verifyToken(token)).toThrow();
    });

    it("throws on a tampered token", () => {
        const token = generateToken(payLoad, "15m");
        expect(() => verifyToken(token.slice(0, -2) + "xx")).toThrow();
    });

    it("rejects a token signed with a different algorithm", () => {
        const forged = jwt.sign(payLoad, "secret", { algorithm: "HS256" });
        expect(() => verifyToken(forged)).toThrow();
    });
});