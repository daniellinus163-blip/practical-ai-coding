"use client";

import { useActionState } from "react";
import { completeTaskAction, rescheduleTaskAction } from "@/app/staff/actions";
import { formatTaskDueAt } from "@/crm/task-datetime";

export type LeadTaskItem = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  assigneeLabel: string | null;
};

function CompleteTaskButton({ taskId, leadId }: { taskId: string; leadId: string }) {
  const [state, action, pending] = useActionState(completeTaskAction, { error: null, success: null });
  return (
    <form action={action} className="inline">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" disabled={pending} className="text-xs underline disabled:opacity-50">
        {pending ? "…" : "Mark complete"}
      </button>
      {state.error ? <span className="ml-2 text-[var(--danger)]">{state.error}</span> : null}
    </form>
  );
}

function RescheduleTaskForm({
  leadId,
  taskId,
  dueAt,
}: {
  leadId: string;
  taskId: string;
  dueAt: string | null;
}) {
  const parsed = formatTaskDueAt(dueAt);
  const [state, action, pending] = useActionState(rescheduleTaskAction, { error: null, success: null });
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2 text-xs">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="leadId" value={leadId} />
      <label>
        Date
        <input
          name="dueDate"
          type="date"
          required
          defaultValue={parsed.date}
          className="ml-1 border border-[var(--line)] px-1 py-0.5"
        />
      </label>
      <label>
        Time (UTC)
        <input
          name="dueTime"
          type="time"
          defaultValue={parsed.time}
          className="ml-1 border border-[var(--line)] px-1 py-0.5"
        />
      </label>
      <button type="submit" disabled={pending} className="underline disabled:opacity-50">
        {pending ? "Saving…" : "Reschedule"}
      </button>
      {state.error ? <span className="text-[var(--danger)]">{state.error}</span> : null}
      {state.success ? <span>{state.success}</span> : null}
    </form>
  );
}

export function LeadTaskList({ leadId, tasks }: { leadId: string; tasks: LeadTaskItem[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No follow-ups yet.</p>;
  }

  const now = Date.now();

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const overdue = task.due_at && !task.completed_at && new Date(task.due_at).getTime() < now;
        return (
          <li key={task.id} className="border border-[var(--line)] bg-[var(--card)] p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium">{task.title}</p>
              {overdue ? <span className="text-[10px] uppercase text-[var(--danger)]">Overdue</span> : null}
            </div>
            {task.description ? <p className="mt-1 text-[var(--muted)]">{task.description}</p> : null}
            <p className="mt-1 text-xs text-[var(--muted)]">
              Due {task.due_at ?? "—"}
              {task.assigneeLabel ? ` · ${task.assigneeLabel}` : ""}
              {task.completed_at ? " · done" : ""}
            </p>
            {!task.completed_at ? (
              <>
                <div className="mt-2 flex gap-3">
                  <CompleteTaskButton taskId={task.id} leadId={leadId} />
                </div>
                <RescheduleTaskForm leadId={leadId} taskId={task.id} dueAt={task.due_at} />
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
