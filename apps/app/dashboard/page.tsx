"use client";

import { useAuthStore } from "@/app/store/useAuthStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/api-client";
import { logout } from "@/app/actions/auth";

export default function Dashboard() {
  const { user, isInitializing, logout: clearStore } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (response.data && Array.isArray(response.data.data)) {
        setTasks(response.data.data);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch tasks:", err);
      setError("Failed to load tasks. Please try again later.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    clearStore();
    router.push("/login");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-subtle/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="mt-4 text-sm font-medium text-accent">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-subtle/30">
        <p className="text-sm font-medium text-accent">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-subtle/30 font-sans text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-bg-subtle bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-dark text-sm font-bold text-bg-subtle shadow-sm">
              TP
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Dashboard
              </h2>
              <p className="text-xs font-medium text-muted">
                Welcome back, {user.name || user.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="rounded-lg border border-bg-subtle bg-white px-4 py-2 text-sm font-semibold text-accent shadow-sm transition-all hover:bg-bg-subtle hover:text-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Logout
            </button>
            <button
              onClick={() => alert("Add task feature coming soon!")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              Add Task
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="mt-4 text-sm font-medium text-accent">Loading your tasks...</p>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={fetchTasks}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted/40 bg-white/50 p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-subtle/50 text-primary">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground">No tasks yet</h3>
                <p className="mt-2 max-w-sm text-sm font-medium text-muted">
                  You don't have any tasks in your workspace. Click "Add Task" to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div 
                    key={task._id || task.id} 
                    className="group relative overflow-hidden rounded-2xl border border-bg-subtle bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-secondary/30"
                  >
                    <div className="flex items-start gap-4">
                      {/* Priority Indicator Dot */}
                      <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${
                        task.priority === "HIGH" || task.priority === "URGENT" ? "bg-primary" :
                        task.priority === "MEDIUM" ? "bg-secondary" : "bg-accent"
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-base font-bold text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                            {task.title}
                          </h3>
                          
                          {/* Status Badge */}
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                            task.status === "COMPLETED"
                              ? "bg-bg-subtle text-primary"
                              : task.status === "IN_PROGRESS"
                              ? "bg-surface-dark/10 text-surface-dark"
                              : "bg-muted/20 text-muted"
                          }`}>
                            {task.status?.replace("_", " ") || "To Do"}
                          </span>
                        </div>

                        <p className="mt-1.5 text-sm font-medium text-muted line-clamp-2">
                          {task.description || "No description provided."}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {/* Priority Badge */}
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            task.priority === "HIGH" || task.priority === "URGENT"
                              ? "bg-primary/10 text-primary"
                              : task.priority === "MEDIUM"
                              ? "bg-secondary/10 text-secondary"
                              : "bg-accent/10 text-accent"
                          }`}>
                            {task.priority || "Medium"}
                          </span>

                          {/* Due Date */}
                          {task.dueDate && (
                            <span className="flex items-center gap-1.5 rounded-md bg-bg-subtle/40 px-2 py-0.5 text-[11px] font-semibold text-surface-dark">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}

                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {task.tags.slice(0, 3).map((tag: string, idx: number) => (
                                <span key={idx} className="rounded-md bg-muted/10 px-2 py-0.5 text-[11px] font-semibold text-muted">
                                  #{tag}
                                </span>
                              ))}
                              {task.tags.length > 3 && (
                                <span className="rounded-md bg-muted/10 px-2 py-0.5 text-[11px] font-semibold text-muted">
                                  +{task.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}