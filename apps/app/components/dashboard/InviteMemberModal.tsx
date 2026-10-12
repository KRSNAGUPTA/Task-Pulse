"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/app/store/useAuthStore";
import { apiClient } from "@/app/lib/api-client";
import { X, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const { user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [isLoading, setIsLoading] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();
  const canSubmit = !!trimmedEmail && !!user?.activeOrgId && !isLoading;

  // Reset form when modal opens fresh
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setRole("MEMBER");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);

    try {
      await toast.promise(
        apiClient.post(`/api/auth/org/${user!.activeOrgId}/members`, {
          email: trimmedEmail,
          role,
        }),
        {
          loading: {
            title: "Sending invite…",
            description: `Inviting ${trimmedEmail}.`,
          },
          success: {
            title: "Invite sent",
            description: `${trimmedEmail} will receive an email shortly.`,
          },
          error: (err: any) => {
            console.error("Failed to invite member", err);
            return {
              title: "Failed to invite member",
              description:
                err?.response?.data?.message ||
                "Ensure they have an account and try again.",
            };
          },
        }
      );

      onSuccess();
      onClose();
      setEmail("");
      setRole("MEMBER");
    } catch {
      // toast.promise already surfaced the error.
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
        className="w-full max-w-md rounded-2xl border border-bg-subtle bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="invite-member-title"
            className="text-lg font-sans font-bold text-foreground"
          >
            Invite Member
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-bg-subtle/40 hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-semibold text-surface-dark mb-1"
            >
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              disabled={isLoading}
              autoFocus
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground placeholder:text-muted transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-semibold text-surface-dark mb-1"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
              disabled={isLoading}
              className="w-full cursor-pointer rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="MEMBER">Member (Can view and edit assigned tasks)</option>
              <option value="ADMIN">Admin (Can manage tasks and members)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-all hover:bg-bg-subtle/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:active:scale-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary disabled:hover:shadow-md disabled:active:scale-100"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Inviting…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}