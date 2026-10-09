import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signup } from "../actions/auth";

describe("Signup Unit Tests", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("1. Should fail Zod validation immediately without calling fetch", async () => {
        const formData = new FormData();
        formData.set("name", "");               
        formData.set("email", "invalid-email"); 
        formData.set("password", "123");        

        const result = await signup(formData);

        expect(result.success).toBe(false);
        if (result.success) return; // ✅ Type guard: narrows to AuthErrorResult

        expect(result.error).toBeDefined();
        expect(fetchMock).not.toHaveBeenCalled(); 
    });

    it("2. Should return success response when backend returns 200 OK", async () => {
        const mockUser = { id: "usr_123", name: "Test User", email: "test@example.com" };

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: mockUser }),
        } as Response);

        const formData = new FormData();
        formData.set("name", "Test User");
        formData.set("email", "test@example.com");
        formData.set("password", "password123");

        const result = await signup(formData);

        expect(result.success).toBe(true);
        if (!result.success) return; // ✅ Type guard: narrows to SignupSuccessResult

        expect(result.message).toBe("Registered Successfully");
        expect(result.user).toEqual(mockUser);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("3. Should return formatted error object when backend returns 409 Conflict", async () => {
        fetchMock.mockResolvedValueOnce({
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
        if (result.success) return; // ✅ Type guard: narrows to AuthErrorResult

        expect(result.status).toBe(409);
        expect(result.error).toBe("Email already registered");
    });

    it("4. Should catch network errors gracefully if fetch throws an exception", async () => {
        fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));

        const formData = new FormData();
        formData.set("name", "Test User");
        formData.set("email", "test@example.com");
        formData.set("password", "password123");

        const result = await signup(formData);

        expect(result.success).toBe(false);
        if (result.success) return; // ✅ Type guard: narrows to AuthErrorResult

        expect(result.error).toBe("Failed to fetch");
    });
});