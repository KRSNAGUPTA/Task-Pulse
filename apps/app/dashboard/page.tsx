// app/dashboard/page.tsx
"use client";

import { useAuthStore } from "@/app/store/useAuthStore";
import { apiClient } from "@/app/lib/api-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/app/components/dashboard/Header";
import { TaskModal } from "@/app/components/dashboard/TaskModal";
import { TaskCard } from "@/app/components/dashboard/TaskCard";
import { Task } from "@/app/types/task";

export default function DashboardPage() {
  const { user, isInitializing } = useAuthStore();
  const router = useRouter();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!isInitializing) {
      if (!user) {
        router.push("/login");
        return;
      }
      fetchTasks();
    }
  }, [user, isInitializing, router]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/task");
      setTasks(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err: any) {
      console.error("Failed to fetch tasks:", err);
      setError("Failed to load tasks. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiClient.delete(`/api/task/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      alert("Failed to delete task.");
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-subtle/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="mt-4 text-sm font-medium text-accent">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-subtle/30 font-sans text-foreground">
      <DashboardHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Your Tasks</h2>
            <p className="text-sm text-muted mt-1">{tasks.length} total tasks in this workspace</p>
          </div>
          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Task
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="mt-4 text-sm font-medium text-accent">Loading your tasks...</p>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button onClick={fetchTasks} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover">Retry</button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted/40 bg-white/50 p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-subtle/50 text-primary">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h3 className="text-lg font-display font-bold text-foreground">No tasks yet</h3>
            <p className="mt-2 max-w-sm text-sm font-medium text-muted">Click "New Task" to create your first task and get organized.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }} 
        taskToEdit={editingTask} 
        onSuccess={fetchTasks} 
      />
    </div>
  );
}