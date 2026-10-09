// app/components/dashboard/Header.tsx
"use client";

import { useAuthStore } from "@/app/store/useAuthStore";
import { logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Building2, ChevronDown } from "lucide-react";

export function DashboardHeader() {
  const { user, setActiveOrg } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    useAuthStore.getState().logout();
    router.push("/login");
  };

  const activeOrg = user?.orgs?.find((org) => org.id === user.activeOrgId);

  return (
    <header className="sticky top-0 z-30 border-b border-bg-subtle bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Left Side: Logo & Title */}
        <div className="flex items-center gap-3">
          {/* ✅ Logo uses font-display */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-dark text-sm font-display font-bold text-bg-subtle shadow-sm">
            TP
          </div>
          {/* ✅ All other text uses font-sans */}
          <div>
            <h1 className="text-lg font-sans font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-xs font-medium text-muted">Manage your workspace</p>
          </div>
        </div>

        {/* Right Side: Profile Dropdown */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-bg-subtle bg-white px-3 py-2 text-sm font-semibold text-surface-dark shadow-sm transition-all hover:bg-bg-subtle/50 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <span className="max-w-[120px] truncate sm:max-w-[200px]">
                {user?.name || user?.email}
              </span>
              <ChevronDown className="h-4 w-4 text-muted transition-transform group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64">
              {/* User Info Label */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>

              {/* Org Switcher Section */}
              {user?.orgs && user.orgs.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Workspace
                  </DropdownMenuLabel>
                  {user.orgs.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => setActiveOrg(org.id)}
                      className="flex cursor-pointer items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted" />
                        <span className="truncate">{org.name}</span>
                      </span>
                      {user.activeOrgId === org.id && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {/* Logout Section */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex cursor-pointer items-center gap-2 text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}