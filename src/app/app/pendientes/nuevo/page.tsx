import type { Metadata } from "next";

import { PendingForm } from "@/components/pendings/pending-form";
import { createPending } from "@/modules/pendings/application/pending-actions";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Nuevo pendiente" };

type Props = { searchParams: Promise<{ error?: string; conversation?: string; message?: string; title?: string }> };

function suggestedTitle(content: string): string {
  const clean = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "Revisar respuesta de NEXUS";
  return clean.slice(0, 180);
}

export default async function NewPendingPage({ searchParams }: Props) {
  const params = await searchParams;
  let sourceContent = "";
  if (params.message && params.conversation) {
    const { supabase, membership } = await requireCurrentWorkspace();
    const { data: sourceMessage } = await supabase
      .from("messages")
      .select("content, conversation_id")
      .eq("id", params.message)
      .eq("conversation_id", params.conversation)
      .eq("role", "assistant")
      .maybeSingle();
    if (sourceMessage) {
      const { data: sourceConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", sourceMessage.conversation_id)
        .eq("workspace_id", membership.workspaceId)
        .maybeSingle();
      sourceContent = sourceConversation && typeof sourceMessage.content === "string" ? sourceMessage.content : "";
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <div className="nexus-kicker">Captura global</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Nuevo pendiente</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Registra un compromiso personal o laboral que no pertenece a un proyecto.</p>
      <div className="mt-7">
        <PendingForm
          action={createPending}
          mode="create"
          error={params.error}
          initialValues={{
            title: params.title ?? (sourceContent ? suggestedTitle(sourceContent) : ""),
            description: sourceContent,
            notes: params.message ? `Originado desde el mensaje ${params.message}.` : "",
            status: "inbox",
            priority: "medium",
            category: "General",
            tags: params.message ? ["conversación"] : [],
            dueDate: "",
            dueTime: "",
            reminderAt: "",
            estimatedMinutes: null,
            actualMinutes: null,
            recurrenceType: "none",
            recurrenceInterval: 1,
            recurrenceEndDate: "",
            sourceConversationId: params.conversation ?? "",
            origin: params.conversation ? "conversation" : "manual",
            subtasks: [],
          }}
        />
      </div>
    </div>
  );
}
