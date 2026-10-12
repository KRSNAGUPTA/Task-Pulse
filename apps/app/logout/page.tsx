"use client";

import { useEffect } from "react";
import { logout } from "../actions/auth";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export default function Logout() {
  const { user, logout: clearStore } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        const result = await logout();
        
        if (result.success) {
          clearStore();
          
          toast.add({
            title: "Logout Completed",
            description: "Redirecting to login page!",
          });
        } else {
          console.error("Logout failed:", result.error);
          toast.add({
            title: "Logout Failed",
            description: result.error || "Please try again",
          });
        }
      } catch (error: any) {
        console.error("Failed to logout:", error?.message || error);
        clearStore();
      } finally {
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    };

    handleLogout();
  }, [user, router, clearStore]);

  return (
    <div className="flex flex-col h-screen justify-center items-center bg-bg-subtle/30">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <p className="mt-4 text-sm font-medium text-accent">Logging out...</p>
    </div>
  );
}