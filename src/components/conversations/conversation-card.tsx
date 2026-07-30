import Link from "next/link";
import { Archive, Bot, MessageSquareText, RotateCcw, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { cn } from "@/lib/utils";
import type { ConversationRecord } from "@/modules/conversations/domain/conversation";
import { CONVERSATION_MODE_LABELS } from "@/modules/conversations/domain/conversation";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ConversationCard({
  conversation,
  statusAction,
}: {
  conversation: ConversationRecord;
  statusAction: (formData: FormData) => void | Promise<void>;
}) {
  const archived = conversation.status === "archived";

  return (
    <article className="nexus-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl border"
          style={{
            borderColor: `${conversation.project?.color ?? "#55e6c1"}30`,
            backgroundColor: `${conversation.project?.color ?? "#55e6c1"}10`,
            color: conversation.project?.color ?? "#55e6c1",
          }}
        >
          <MessageSquareText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">
              {conversation.title}
            </h2>
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.62rem] text-muted-foreground">
              {archived ? "Archivada" : "Activa"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground/80">
            <span>{conversation.project?.name ?? "Proyecto"}</span>
            <span className="inline-flex items-center gap-1.5">
              {conversation.mode === "team" ? <Users className="size-3.5" /> : <Bot className="size-3.5" />}
              {CONVERSATION_MODE_LABELS[conversation.mode]}
            </span>
            <span>{conversation.messageCount ?? 0} mensajes</span>
          </div>
        </div>
      </div>

      <p className="mt-5 min-h-12 text-sm leading-6 text-muted-foreground">
        {conversation.lastMessagePreview || "Todavía no hay mensajes en esta conversación."}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="text-[0.68rem] text-muted-foreground/60">
          Actualizada {formatDate(conversation.updated_at)}
        </div>
        <div className="flex items-center gap-2">
          {!archived && (
            <Link
              href={`/app/conversaciones/${conversation.id}`}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Abrir
            </Link>
          )}
          <form action={statusAction}>
            <input type="hidden" name="conversationId" value={conversation.id} />
            <input type="hidden" name="status" value={archived ? "active" : "archived"} />
            <ConfirmSubmitButton
              variant="ghost"
              size="sm"
              confirmationMessage={
                archived
                  ? "¿Restaurar esta conversación?"
                  : "¿Archivar esta conversación? El historial se conservará."
              }
              pendingLabel={archived ? "Restaurando..." : "Archivando..."}
            >
              {archived ? <RotateCcw /> : <Archive />}
              {archived ? "Restaurar" : "Archivar"}
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}
