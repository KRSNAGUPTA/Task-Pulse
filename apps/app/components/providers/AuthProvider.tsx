"use client";

import { useAuthStore } from "@/app/store/useAuthStore";
import { useEffect } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setAccessToken, logout, setInitializing, isInitializing } = useAuthStore();
  
  // Ensure this matches your .env.local variable exactly
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("🔄 Starting auth initialization...");
        setInitializing(true);

        // 1. Refresh the token via Next.js proxy
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (!refreshRes.ok) {
          console.error("❌ Refresh failed with status:", refreshRes.status);
          throw new Error("Refresh failed");
        }

        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.token.accessToken;
        console.log("✅ Token refreshed successfully");

        // 2. Save to store immediately
        setAccessToken(newAccessToken);

        // 3. Fetch /me directly from the Gateway using native fetch
        // This completely bypasses any Axios base URL or interceptor issues
        console.log("📡 Fetching user profile from:", `${gatewayUrl}/api/auth/me`);
        const meRes = await fetch(`${gatewayUrl}/api/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${newAccessToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!meRes.ok) {
          console.error("❌ /me failed with status:", meRes.status);
          throw new Error(`Failed to fetch user profile: ${meRes.status}`);
        }

        const meData = await meRes.json();
        console.log("✅ User profile fetched successfully:", meData);
        
        // Handle both { user: {...} } and direct {...} response shapes
        const userData = meData.user || meData;

        // 4. Hydrate the store
        setAuth(userData, newAccessToken);
        console.log("✅ Auth store hydrated for user:", userData.email);
        
      } catch (error) {
        console.error("💥 Auth initialization FAILED. Redirecting to login. Error:", error);
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