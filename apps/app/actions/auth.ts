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
            return { error: parseResult.error.issues[0]?.message || "Invalid email or password" };
        }

        const baseUrl = process.env.API_GATEWAY || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080";
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(parseResult.data),
            cache: 'no-store'
        });

        const data = await response.json();

        // 5. Check HTTP status before accessing properties
        if (!response.ok) {
            return { error: data.message || "Invalid email or password" };
        }

        // 6. Set HTTP-only RefreshToken cookie on Next.js response[cite: 3]
        const setCookieHeaders = response.headers.get("set-cookie");
        if (setCookieHeaders) {
            const rawCookieValue = extractCookieValue(setCookieHeaders);
            if (rawCookieValue) {
                const cookieStore = await cookies();
                cookieStore.set("RefreshToken", rawCookieValue, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production", // Enabled in prod[cite: 3]
                    sameSite: "lax",
                    path: "/",
                    maxAge: 7 * 24 * 60 * 60 // 7 days
                });
            }
        }

        const loginRes = data as LoginRes;
        
        return {
            accessToken: loginRes.token.accessToken,
            user: loginRes.user,
            org: loginRes.org
        };

    } catch (error: any) {
        console.error("Login Server Action Error:", error?.message || error);
        return { error: "Unable to reach authentication service. Please try again later." };
    }
}

function extractCookieValue(cookieHeader: string): string {
    const match = cookieHeader.match(/RefreshToken=([^;]+)/);
    return match ? match[1] : "";
}