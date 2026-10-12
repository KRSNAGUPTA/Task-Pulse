// app/components/dashboard/Header.tsx
"use client";

import { useAuthStore } from "@/app/store/useAuthStore";
import { logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Building2, ChevronDown, Plus, UserPlus, Loader2 } from "lucide-react";
import { apiClient } from "@/app/lib/api-client";
import { CreateOrgModal } from "./CreateOrgModal";
import { InviteMemberModal } from "./InviteMemberModal";
import { toast } from "@/components/ui/toast";

export function DashboardHeader() {
  const { user, applyOrgSwitch, logout: clearStore } = useAuthStore();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      clearStore();
      router.push("/login");
    }
  };

  const handleSwitchOrg = async (orgId: string) => {
    if (user?.activeOrgId === orgId || isSwitching) return;

    setIsSwitching(true);
    try {
      const res = await apiClient.post("/api/auth/switch-org", { orgId });
      const newAccessToken = res.data?.token?.accessToken;

      if (!newAccessToken) {
        throw new Error("Switch org response missing access token");
      }

      applyOrgSwitch(orgId, newAccessToken);

      toast.add({
        type: "success",
        title: "Workspace switched",
        description: user?.orgs?.find((o) => o.id === orgId)?.name ?? "",
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      console.error("Failed to switch org", error);
      toast.add({
        type: "error",
        title: "Could not switch workspace",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please try again.",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const activeOrg = user?.orgs?.find((org) => org.id === user.activeOrgId);

  return (
    <header className="sticky top-0 z-30 border-b border-bg-subtle/50 bg-white/70 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dark text-xs font-display font-bold text-bg-subtle shadow-sm ring-1 ring-black/5">
            TP
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-[11px] font-medium text-muted leading-none">Manage your workspace</p>
          </div>
        </div>

        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-full border border-bg-subtle/60 bg-white/60 px-2 py-1.5 pr-3 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-bg-subtle/40 hover:border-bg-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                {isSwitching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="max-w-[100px] truncate sm:max-w-[160px] text-sm">
                {activeOrg?.name || user?.name || user?.email}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 rounded-xl border border-bg-subtle/60 bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5 p-1">
              <DropdownMenuGroup className="px-2 py-2">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{user?.name || "User"}</p>
                    <p className="text-xs text-muted truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              {user?.orgs && user.orgs.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-bg-subtle/60" />
                  <DropdownMenuGroup className="py-1">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Workspaces
                    </DropdownMenuLabel>
                    {user.orgs.map((org) => {
                      const isActive = user.activeOrgId === org.id;
                      return (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() => handleSwitchOrg(org.id)}
                          disabled={isSwitching || isActive}
                          className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-bg-subtle/50 focus:bg-bg-subtle/50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <span className="flex items-center gap-2.5">
                            <Building2 className="h-3.5 w-3.5 text-muted" />
                            <span className="truncate font-medium text-foreground">
                              {org.name || org.slug || org.id}
                            </span>
                          </span>
                          {isActive && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary ring-2 ring-white" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                </>
              )}

              <DropdownMenuSeparator className="bg-bg-subtle/60" />

              <DropdownMenuGroup className="py-1">
                <DropdownMenuItem
                  onClick={() => setIsCreateOrgOpen(true)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-bg-subtle/50"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Create Workspace</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsInviteOpen(true)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-bg-subtle/50"
                >
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  <span>Invite Members</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="bg-bg-subtle/60" />
              <DropdownMenuGroup className="py-1">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CreateOrgModal
        isOpen={isCreateOrgOpen}
        onClose={() => setIsCreateOrgOpen(false)}
        onSuccess={() => {
          router.refresh();
          setIsCreateOrgOpen(false);
        }}
      />
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => {
          setIsInviteOpen(false);
        }}
      />
    </header>
  );
}