import Link from "next/link";
import { Boxes, CalendarClock, GitMerge, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskRecord,
} from "@/modules/tasks/domain/task";

function formatDueDate(value: string | null): string {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export function TaskCard({ task }: { task: TaskRecord }) {
  return (
    <Link href={`/app/tareas/${task.id}`} className="nexus-focus block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.018]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-medium leading-6 text-foreground">{task.title}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground/80">{task.project?.name}</div>
        </div>
        <span className={cn(
          "shrink-0 rounded-full border px-2 py-1 text-[0.58rem]",
          task.priority === "critical" && "border-rose-400/15 bg-rose-400/[0.05] text-rose-300",
          task.priority === "high" && "border-amber-400/15 bg-amber-400/[0.05] text-amber-300",
          task.priority === "medium" && "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300",
          task.priority === "low" && "border-slate-400/10 bg-slate-400/[0.03] text-muted-foreground",
        )}>{TASK_PRIORITY_LABELS[task.priority]}</span>
      </div>
      {task.description ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground/80">{task.description}</p> : null}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted/50">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${task.progress}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.62rem] text-muted-foreground/80">
        <span>{TASK_STATUS_LABELS[task.status]}</span>
        <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />{formatDueDate(task.due_date)}</span>
        {task.assignedAgent ? <span className="inline-flex min-w-0 items-center gap-1"><UserRound className="size-3" /><span className="max-w-28 truncate">{task.assignedAgent.name}</span></span> : null}
        {(task.dependencies?.length ?? 0) > 0 ? <span className="inline-flex items-center gap-1"><GitMerge className="size-3" />{task.dependencies?.length}</span> : null}
        {(task.artifactCount ?? 0) > 0 ? <span className="inline-flex items-center gap-1"><Boxes className="size-3" />{task.artifactCount}</span> : null}
      </div>
    </Link>
  );
}
