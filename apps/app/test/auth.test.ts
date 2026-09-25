import { describe, it, expect, vi, beforeEach } from "vitest";
import { signup } from "../actions/auth";

describe("Signup Unit Tests", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("1. Should fail Zod validation immediately without calling fetch", async () => {
        const fetchSpy = vi.spyOn(global, "fetch");

        const formData = new FormData();
        formData.set("name", "");               // Invalid empty name
        formData.set("email", "invalid-email"); // Invalid email
        formData.set("password", "123");        // Invalid short password

        const result = await signup(formData);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        // Verifies network call was NEVER triggered
        expect(fetchSpy).not.toHaveBeenCalled(); 
    });

    it("2. Should return success response when backend returns 200 OK", async () => {
        const mockUser = { id: "usr_123", name: "Test User", email: "test@example.com" };

        vi.spyOn(global, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: mockUser }),
        } as Response);

        const formData = new FormData();
        formData.set("name", "Test User");
        formData.set("email", "test@example.com");
        formData.set("password", "password123");

        const result = await signup(formData);

        expect(result.success).toBe(true);
        expect(result.message).toBe("Registered Successfully");
        expect(result.user).toEqual(mockUser);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("3. Should return formatted error object when backend returns 409 Conflict", async () => {
        // Mock fetch to simulate 409 Conflict from backend
        vi.spyOn(global, "fetch").mockResolvedValueOnce({
            ok: false,
            status: 409,
            json: async () => ({ message: "Email already registered" }),
        } as Response);

        const formData = new FormData();
        formData.set("name", "Test User");
        formData.set("email", "existing@example.com");
        formData.set("password", "password123");

        const result = await signup(formData);

        expect(result.success).toBe(false);
        expect(result.status).toBe(409);
        expect(result.error).toBe("Email already registered");
    });

    it("4. Should catch network errors gracefully if fetch throws an exception", async () => {
        // Simulate total network breakdown / server down
        vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Failed to fetch"));

        const formData = new FormData();
        formData.set("name", "Test User");
        formData.set("email", "test@example.com");
        formData.set("password", "password123");

        const result = await signup(formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch");
    });
});