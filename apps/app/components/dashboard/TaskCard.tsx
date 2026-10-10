// app/components/dashboard/TaskCard.tsx
"use client";
import { Task } from "@/app/types/task";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const completedSubtasks = task.subtasks?.filter((st) => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const statusColors = {
    TO_DO: "bg-muted/20 text-muted",
    IN_PROGRESS: "bg-surface-dark/10 text-surface-dark",
    COMPLETED: "bg-bg-subtle text-primary",
    ARCHIVED: "bg-gray-100 text-gray-500",
  };

  const priorityColors = {
    LOW: "bg-accent/10 text-accent",
    MEDIUM: "bg-secondary/10 text-secondary",
    HIGH: "bg-primary/10 text-primary",
    URGENT: "bg-red-100 text-red-700",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-bg-subtle bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-secondary/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${statusColors[task.status]}`}>
              {task.status.replace("_", " ")}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{task.title}</h3>
          <p className="mt-1.5 text-sm font-medium text-muted line-clamp-2">{task.description || "No description"}</p>
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)} className="p-2 rounded-lg hover:bg-bg-subtle text-muted hover:text-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => onDelete(task.id)} className="p-2 rounded-lg hover:bg-red-50 text-muted hover:text-red-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {(totalSubtasks > 0 || (task.tags && task.tags.length > 0) || task.dueDate) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-bg-subtle/50">
          {totalSubtasks > 0 && (
            <span className="flex items-center gap-1.5 rounded-md bg-bg-subtle/40 px-2 py-0.5 text-[11px] font-semibold text-surface-dark">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              {completedSubtasks}/{totalSubtasks} subtasks
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1.5 rounded-md bg-bg-subtle/40 px-2 py-0.5 text-[11px] font-semibold text-surface-dark">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.tags?.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="rounded-md bg-muted/10 px-2 py-0.5 text-[11px] font-semibold text-muted">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}