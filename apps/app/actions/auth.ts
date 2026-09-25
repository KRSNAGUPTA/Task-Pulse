'use server';

import { cookies } from "next/headers";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().trim().lowercase().email("Invalid email address"),
    password: z.string().trim().min(6, "Password must be at least 6 characters")
});

export const signUpSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().lowercase().email("Invalid email address"),
    password: z.string().trim().min(6, "Password must be at least 6 characters")
});

const baseUrl = process.env.API_GATEWAY || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:5001";

type LoginRes = {
    user: {
        id: string;
        name: string;
        email: string;
    };
    org?: {
        id: string;
        role: string;
    };
    token: {
        accessToken: string;
    };
};

export async function login(formData: FormData) {
    try {
        const parseResult = loginSchema.safeParse({
            email: formData.get("email"),
            password: formData.get("password")
        });

        if (!parseResult.success) {
            return { 
                success: false,
                error: parseResult.error.issues[0]?.message || "Invalid email or password" 
            };
        }

        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(parseResult.data),
            cache: 'no-store'
        });

        const data = await response.json();

        if (!response.ok) {
            return { 
                success: false,
                error: data.message || "Invalid email or password" 
            };
        }

        // Set HTTP-only RefreshToken cookie on Next.js response
        const setCookieHeaders = response.headers.get("set-cookie");
        if (setCookieHeaders) {
            const rawCookieValue = extractCookieValue(setCookieHeaders);
            if (rawCookieValue) {
                const cookieStore = await cookies();
                cookieStore.set("RefreshToken", rawCookieValue, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production", 
                    sameSite: "lax",
                    path: "/",
                    maxAge: 7 * 24 * 60 * 60 // 7 days
                });
            }
        }

        const loginRes = data as LoginRes;
        
        return {
            success: true,
            accessToken: loginRes.token.accessToken,
            user: loginRes.user,
            org: loginRes.org
        };

    } catch (error: any) {
        console.error("Login Server Action Error:", error?.message || error);
        return { 
            success: false,
            error: "Unable to reach authentication service. Please try again later." 
        };
    }
}

export async function signup(formData: FormData) {
    const zodRes = signUpSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password")
    });

    if (!zodRes.success) {
        return {
            success: false,
            error: zodRes.error.issues[0]?.message || "Invalid form data input"
        };
    }

    try {
        const res = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            body: JSON.stringify(zodRes.data),
            headers: {
                "Content-Type": "application/json"
            },
            cache: 'no-store'
        });

        const data = await res.json();

        if (!res.ok) {
            return {
                success: false,
                status: res.status, // e.g., 409 Conflict
                error: data?.message || "Failed to register"
            };
        }

        return {
            success: true,
            message: "Registered Successfully",
            user: data?.user
        };

    } catch (error: any) {
        console.error("Signup Server Action Error:", error?.message || error);
        return {
            success: false,
            error: error?.message || "Unable to reach authentication service."
        };
    }
}

function extractCookieValue(cookieHeader: string): string {
    const match = cookieHeader.match(/RefreshToken=([^;]+)/);
    return match ? match[1] : "";
}