"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/app/lib/api-client";
import { X, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrgModal({ isOpen, onClose, onSuccess }: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = !!trimmedName && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);

    try {
      await toast.promise(
        apiClient.post("/api/auth/org", { name: trimmedName }),
        {
          loading: {
            title: "Creating workspace…",
            description: `Setting up "${trimmedName}".`,
          },
          success: {
            title: "Workspace created",
            description: `"${trimmedName}" is ready to use.`,
          },
          error: (err) => {
            console.error("Failed to create org", err);
            return {
              title: "Failed to create workspace",
              description: "Something went wrong. Please try again.",
            };
          },
        }
      );

      onSuccess();
      onClose();
      setName("");
    } catch {
      // toast.promise already surfaced the error toast — nothing else to do.
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
        aria-labelledby="create-org-title"
        className="w-full max-w-md rounded-2xl border border-bg-subtle bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="create-org-title"
            className="text-lg font-sans font-bold text-foreground"
          >
            Create Workspace
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
              htmlFor="org-name"
              className="block text-sm font-semibold text-surface-dark mb-1"
            >
              Workspace Name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Task Pulse Corp"
              disabled={isLoading}
              autoFocus
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground placeholder:text-muted transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
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
              {isLoading ? "Creating…" : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}