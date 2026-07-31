import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PendingForm } from "@/components/pendings/pending-form";
import { updatePending } from "@/modules/pendings/application/pending-actions";
import { loadPendingById } from "@/modules/pendings/application/pending-queries";
import { pendingIdSchema } from "@/modules/pendings/domain/pending-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Editar pendiente" };

type Props = { params: Promise<{ pendingId: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditPendingPage({ params, searchParams }: Props) {
  const { pendingId } = await params;
  const messages = await searchParams;
  const parsed = pendingIdSchema.safeParse(pendingId);
  if (!parsed.success) return notFound();
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const pending = await loadPendingById(supabase, membership.workspaceId, user.id, parsed.data);
  if (!pending) return notFound();

  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <div className="nexus-kicker">Gestión personal</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Editar {pending.title}</h1>
      <div className="mt-7">
        <PendingForm
          action={updatePending}
          mode="edit"
          pendingId={pending.id}
          error={messages.error}
          initialValues={{
            title: pending.title,
            description: pending.description,
            notes: pending.notes,
            status: pending.status,
            priority: pending.priority,
            category: pending.category,
            tags: pending.tags,
            dueDate: pending.due_date ?? "",
            dueTime: pending.due_time?.slice(0, 5) ?? "",
            reminderAt: pending.reminder_at ?? "",
            estimatedMinutes: pending.estimated_minutes,
            actualMinutes: pending.actual_minutes,
            recurrenceType: pending.recurrence_type,
            recurrenceInterval: pending.recurrence_interval,
            recurrenceEndDate: pending.recurrence_end_date ?? "",
            sourceConversationId: pending.source_conversation_id ?? "",
            origin: pending.origin,
            subtasks: pending.subtasks.map((item) => item.title),
          }}
        />
      </div>
    </div>
  );
}
