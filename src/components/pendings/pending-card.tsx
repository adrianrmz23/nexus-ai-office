import Link from "next/link";
import { AlarmClock, CalendarDays, CheckCircle2, CircleDot, ListChecks, PauseCircle, Tags } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPendingDate, relativePendingLabel } from "@/lib/pending-date";
import {
  PENDING_PRIORITY_LABELS,
  PENDING_STATUS_LABELS,
  type PendingRecord,
} from "@/modules/pendings/domain/pending";

const priorityClass: Record<PendingRecord["priority"], string> = {
  low: "border-slate-400/20 bg-slate-400/[0.04] text-slate-600 dark:text-slate-300",
  medium: "border-cyan-400/20 bg-cyan-400/[0.04] text-cyan-700 dark:text-cyan-200",
  high: "border-amber-400/25 bg-amber-400/[0.055] text-amber-700 dark:text-amber-200",
  urgent: "border-rose-400/25 bg-rose-400/[0.055] text-rose-700 dark:text-rose-200",
};

const statusIcon = {
  inbox: CircleDot,
  pending: AlarmClock,
  in_progress: PauseCircle,
  waiting: PauseCircle,
  completed: CheckCircle2,
  cancelled: PauseCircle,
  archived: PauseCircle,
};

export function PendingCard({ pending, compact = false, today }: { pending: PendingRecord; compact?: boolean; today?: string }) {
  const StatusIcon = statusIcon[pending.status];
  const dueState = relativePendingLabel(pending.due_date, today);
  const completedSubtasks = pending.subtasks.filter((item) => item.is_completed).length;

  return (
    <Link
      href={`/app/pendientes/${pending.id}`}
      className={cn(
        "nexus-focus block rounded-2xl border border-border bg-card transition hover:border-primary/25 hover:shadow-sm",
        compact ? "p-4" : "p-5",
        dueState === "overdue" && !["completed", "cancelled", "archived"].includes(pending.status) && "border-rose-400/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{pending.title}</h3>
            <span className={cn("rounded-full border px-2 py-0.5 text-[0.6rem] font-medium", priorityClass[pending.priority])}>{PENDING_PRIORITY_LABELS[pending.priority]}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><StatusIcon className="size-3" />{PENDING_STATUS_LABELS[pending.status]}</span>
            <span className={cn("inline-flex items-center gap-1", dueState === "overdue" && "text-rose-600 dark:text-rose-300")}><CalendarDays className="size-3" />{formatPendingDate(pending.due_date, pending.due_time)}</span>
          </div>
        </div>
        <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 font-mono text-[0.58rem] text-muted-foreground">{Math.max(0, pending.priorityScore)} pts</span>
      </div>

      {!compact && pending.description ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{pending.description}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
        <span className="rounded-full border border-border bg-muted/25 px-2.5 py-1">{pending.category}</span>
        {pending.subtasks.length ? <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/25 px-2.5 py-1"><ListChecks className="size-3" />{completedSubtasks}/{pending.subtasks.length}</span> : null}
        {pending.estimated_minutes ? <span>{pending.estimated_minutes} min estimados</span> : null}
        {pending.tags.slice(0, 3).map((tag) => <span key={tag} className="inline-flex items-center gap-1"><Tags className="size-3" />{tag}</span>)}
      </div>
    </Link>
  );
}
