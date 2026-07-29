import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive } from "lucide-react";

import { ChatWorkspace } from "@/components/conversations/chat-workspace";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadConversationById,
  loadConversationMessages,
  loadExecutableModels,
  loadProjectAgentOptions,
} from "@/modules/conversations/application/conversation-queries";
import { conversationIdSchema } from "@/modules/conversations/domain/conversation-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Conversación" };

type Props = { params: Promise<{ conversationId: string }> };

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const parsed = conversationIdSchema.safeParse(conversationId);
  if (!parsed.success) notFound();

  const { supabase, membership } = await requireCurrentWorkspace();
  const conversation = await loadConversationById(
    supabase,
    membership.workspaceId,
    parsed.data,
  );
  if (!conversation || !conversation.project) notFound();

  const [messages, agents, models] = await Promise.all([
    loadConversationMessages(supabase, membership.workspaceId, conversation.id),
    loadProjectAgentOptions(supabase, membership.workspaceId, [conversation.project_id]),
    loadExecutableModels(supabase, membership.workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-[96rem] pb-20 lg:pb-0">
      <Link
        href="/app/conversaciones"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        <ArrowLeft /> Volver a conversaciones
      </Link>

      {conversation.status === "archived" ? (
        <section className="nexus-panel grid min-h-96 place-items-center rounded-2xl p-8 text-center">
          <div>
            <Archive className="mx-auto size-8 text-slate-600" />
            <h1 className="mt-4 text-xl font-semibold text-slate-200">
              Esta conversación está archivada
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Restáurala desde el listado para continuar trabajando.
            </p>
          </div>
        </section>
      ) : (
        <ChatWorkspace
          conversation={{
            id: conversation.id,
            projectId: conversation.project_id,
            title: conversation.title,
            mode: conversation.mode,
            selectedAgentId: conversation.selected_agent_id,
            preferredModelId: conversation.preferred_model_id,
            projectName: conversation.project.name,
            projectColor: conversation.project.color,
          }}
          initialMessages={messages}
          agents={agents}
          models={models}
        />
      )}
    </div>
  );
}
