"use client";

import { apiClient } from "@/app/lib/api-client";
import { useAuthStore } from "@/app/store/useAuthStore";
import { useEffect } from "react";


export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, accessToken, setAuth, logout, setInitializing, isInitializing } = useAuthStore();

    useEffect(() => {
        const initAuth = async () => {
            try {
                setInitializing(true);
                const res = await apiClient.post("/api/auth/refresh");

                const user = await apiClient.get("/api/auth/me")

                setAuth(user.data.user, res.data.token.accessToken)

            } catch (error) {
                logout()
            } finally {
                setInitializing(false)
            }
        }

        initAuth();

    }, [setAuth, setInitializing, logout])

    if (isInitializing) {
        return <div className="h-screen w-full flex justify-center items-center">
            <div className="text-3xl animate-pulse">Loading...</div>
        </div>
    }
    return <>{children}</>
}