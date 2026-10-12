// app/components/dashboard/TaskModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/app/lib/api-client";
import { useAuthStore } from "@/app/store/useAuthStore";
import { Task, CreateTaskPayload, TaskStatus, TaskPriority, Subtask } from "@/app/types/task";
import { X, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSuccess: () => void;
}

export function TaskModal({ isOpen, onClose, taskToEdit, onSuccess }: TaskModalProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string | null; email: string; role: string }[]>([]);

  const [formData, setFormData] = useState<CreateTaskPayload>({
    title: "",
    description: "",
    status: "TO_DO",
    priority: "MEDIUM",
    dueDate: null,
    reminderAt: null,
    assigneeId: null,
    tags: [],
    subtasks: [],
  });
  const [tagInput, setTagInput] = useState("");

  const isEditing = !!taskToEdit;
  const canSubmit = !!formData.title.trim() && !loading;

  // Fetch members for the assignee dropdown when modal opens
  useEffect(() => {
    if (isOpen && user?.activeOrgId) {
      apiClient
        .get(`/api/auth/org/${user.activeOrgId}/members`)
        .then((res) => setMembers(res.data.data || []))
        .catch(() => setMembers([]));
    }
  }, [isOpen, user?.activeOrgId]);

  // Pre-fill form when editing
  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        title: taskToEdit.title,
        description: taskToEdit.description || "",
        status: taskToEdit.status,
        priority: taskToEdit.priority,
        dueDate: taskToEdit.dueDate,
        reminderAt: taskToEdit.reminderAt || null,
        assigneeId: taskToEdit.assigneeId || null,
        tags: taskToEdit.tags || [],
        subtasks: taskToEdit.subtasks || [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: "TO_DO",
        priority: "MEDIUM",
        dueDate: null,
        reminderAt: null,
        assigneeId: null,
        tags: [],
        subtasks: [],
      });
    }
    setTagInput("");
  }, [taskToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);

    const isEdit = isEditing;
    const request = isEdit
      ? apiClient.patch(`/api/task/${taskToEdit!.id}`, formData)
      : apiClient.post("/api/task", formData);

    try {
      await toast.promise(request, {
        loading: {
          title: isEdit ? "Updating task…" : "Creating task…",
        },
        success: {
          title: isEdit ? "Task updated" : "Task created",
          description: formData.title.trim(),
        },
        error: (err: any) => {
          console.error("Failed to save task", err);
          return {
            title: "Failed to save task",
            description:
              err?.response?.data?.message || "Please check your input and try again.",
          };
        },
      });

      onSuccess();
      onClose();
    } catch {
      // toast.promise already surfaced the error.
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = () => {
    setFormData({
      ...formData,
      subtasks: [...(formData.subtasks || []), { title: "", isCompleted: false }],
    });
  };

  const updateSubtask = (index: number, field: keyof Subtask, value: any) => {
    const updated = [...(formData.subtasks || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, subtasks: updated });
  };

  const removeSubtask = (index: number) => {
    const updated = [...(formData.subtasks || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, subtasks: updated });
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim();
      if (!formData.tags?.includes(tag)) {
        setFormData({ ...formData, tags: [...(formData.tags || []), tag] });
      }
      setTagInput("");
    }
  };

  const removeTag = (index: number) => {
    setFormData({ ...formData, tags: formData.tags?.filter((_, i) => i !== index) });
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
        aria-labelledby="task-modal-title"
        className="w-full max-w-2xl rounded-2xl border border-bg-subtle bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            id="task-modal-title"
            className="text-xl font-sans font-bold text-foreground"
          >
            {isEditing ? "Edit Task" : "Create New Task"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-bg-subtle/40 hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-surface-dark mb-1">
              Title *
            </label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={loading}
              placeholder="e.g., Q3 Marketing Plan"
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground placeholder:text-muted transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-dark mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as TaskStatus })
                }
                disabled={loading}
                className="w-full cursor-pointer rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="TO_DO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-dark mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as TaskPriority })
                }
                disabled={loading}
                className="w-full cursor-pointer rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due date + Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-dark mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={
                  formData.dueDate
                    ? new Date(formData.dueDate).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                disabled={loading}
                className="w-full cursor-pointer rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-dark mb-1">
                Assignee
              </label>
              <select
                value={formData.assigneeId || ""}
                onChange={(e) =>
                  setFormData({ ...formData, assigneeId: e.target.value || null })
                }
                disabled={loading}
                className="w-full cursor-pointer rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-surface-dark mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              placeholder="Add more details about this task..."
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground placeholder:text-muted transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-surface-dark">
                Subtasks
              </label>
              <button
                type="button"
                onClick={addSubtask}
                disabled={loading}
                className="cursor-pointer text-xs font-bold text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Subtask
              </button>
            </div>
            <div className="space-y-2">
              {formData.subtasks?.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={st.isCompleted}
                    onChange={(e) =>
                      updateSubtask(idx, "isCompleted", e.target.checked)
                    }
                    disabled={loading}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <input
                    type="text"
                    placeholder="Subtask title"
                    required
                    value={st.title}
                    onChange={(e) => updateSubtask(idx, "title", e.target.value)}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-1.5 text-sm text-foreground placeholder:text-muted transition-shadow focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => removeSubtask(idx)}
                    disabled={loading}
                    aria-label="Remove subtask"
                    className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted disabled:active:scale-100"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-surface-dark mb-1">
              Tags (Press Enter)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 rounded-md bg-bg-subtle/50 px-2 py-1 text-xs font-semibold text-surface-dark"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    disabled={loading}
                    aria-label={`Remove tag ${tag}`}
                    className="cursor-pointer text-muted transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              disabled={loading}
              placeholder="Add a tag..."
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm text-foreground placeholder:text-muted transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-bg-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-all hover:bg-bg-subtle/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:active:scale-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary disabled:hover:shadow-md disabled:active:scale-100"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? "Saving…"
                : isEditing
                ? "Update Task"
                : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}