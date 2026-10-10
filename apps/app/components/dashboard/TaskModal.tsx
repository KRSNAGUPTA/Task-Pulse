// app/components/dashboard/TaskModal.tsx
"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/api-client";
import { Task, CreateTaskPayload, TaskStatus, TaskPriority, Subtask } from "@/app/types/task";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSuccess: () => void;
}

export function TaskModal({ isOpen, onClose, taskToEdit, onSuccess }: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTaskPayload>({
    title: "",
    description: "",
    status: "TO_DO",
    priority: "MEDIUM",
    dueDate: null,
    tags: [],
    subtasks: [],
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (taskToEdit) {
      // Pre-fill with ALL fields to satisfy the OpenAPI PATCH caveat
      setFormData({
        title: taskToEdit.title,
        description: taskToEdit.description,
        status: taskToEdit.status,
        priority: taskToEdit.priority,
        dueDate: taskToEdit.dueDate,
        tags: taskToEdit.tags || [],
        subtasks: taskToEdit.subtasks || [],
      });
    } else {
      setFormData({ title: "", description: "", status: "TO_DO", priority: "MEDIUM", dueDate: null, tags: [], subtasks: [] });
    }
  }, [taskToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (taskToEdit) {
        await apiClient.patch(`/api/task/${taskToEdit.id}`, formData);
      } else {
        await apiClient.post("/api/task", formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save task", err);
      alert("Failed to save task. Please check your input.");
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = () => {
    setFormData({ ...formData, subtasks: [...(formData.subtasks || []), { title: "", isCompleted: false }] });
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
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
      setTagInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dark/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-display font-bold text-foreground mb-6">
          {taskToEdit ? "Edit Task" : "Create New Task"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-surface-dark mb-1">Title *</label>
            <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-dark mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TO_DO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-dark mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-dark mb-1">Due Date</label>
            <input type="datetime-local" value={formData.dueDate ? new Date(formData.dueDate).toISOString().slice(0, 16) : ""}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-dark mb-1">Description</label>
            <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-surface-dark">Subtasks</label>
              <button type="button" onClick={addSubtask} className="text-xs font-bold text-primary hover:underline">+ Add Subtask</button>
            </div>
            <div className="space-y-2">
              {formData.subtasks?.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="checkbox" checked={st.isCompleted} onChange={(e) => updateSubtask(idx, "isCompleted", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <input type="text" placeholder="Subtask title" required value={st.title} onChange={(e) => updateSubtask(idx, "title", e.target.value)}
                    className="flex-1 rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  <button type="button" onClick={() => removeSubtask(idx)} className="text-red-500 hover:text-red-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-surface-dark mb-1">Tags (Press Enter)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag, idx) => (
                <span key={idx} className="flex items-center gap-1 rounded-md bg-bg-subtle/50 px-2 py-1 text-xs font-semibold text-surface-dark">
                  {tag}
                  <button type="button" onClick={() => setFormData({ ...formData, tags: formData.tags?.filter((_, i) => i !== idx) })} className="text-muted hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Add a tag..."
              className="w-full rounded-lg border border-bg-subtle bg-bg-subtle/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-bg-subtle">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:bg-bg-subtle/30">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover disabled:opacity-50">
              {loading ? "Saving..." : taskToEdit ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}