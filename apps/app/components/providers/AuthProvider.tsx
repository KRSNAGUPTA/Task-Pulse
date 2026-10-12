// app/components/auth/AuthProvider.tsx
"use client";

import { useAuthStore } from "@/app/store/useAuthStore";
import { useEffect } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setAccessToken, logout, setInitializing, isInitializing } = useAuthStore();
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

  useEffect(() => {
    const initAuth = async () => {
      try {
        setInitializing(true);

        // 1. Refresh token via Next.js proxy
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (!refreshRes.ok) throw new Error("Refresh failed");

        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.token.accessToken;
        setAccessToken(newAccessToken);

        // 2. Fetch user profile with orgs
        const meRes = await fetch(`${gatewayUrl}/api/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${newAccessToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!meRes.ok) throw new Error("Failed to fetch user profile");

        const meData = await meRes.json();
        
        // 3. Hydrate store with user + orgs
        const user = {
          ...meData.user,
          activeOrgId: meData.activeOrgId,
          orgs: meData.orgs
        };

        setAuth(user, newAccessToken);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        logout();
      } finally {
        setInitializing(false);
      }
    };

    initAuth();
  }, [setAuth, setAccessToken, logout, setInitializing, gatewayUrl]);

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex flex-col justify-center items-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        <p className="mt-4 text-sm text-slate-500">Verifying session...</p>
      </div>
    );
  }

  return <>{children}</>;
}