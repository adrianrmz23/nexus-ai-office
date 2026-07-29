import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { ConversationForm } from "@/components/conversations/conversation-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createConversation } from "@/modules/conversations/application/conversation-actions";
import {
  loadConversationProjects,
  loadExecutableModels,
  loadProjectAgentOptions,
} from "@/modules/conversations/application/conversation-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Nueva conversación" };

type Props = {
  searchParams: Promise<{ project?: string; error?: string; success?: string }>;
};

export default async function NewConversationPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const projects = await loadConversationProjects(supabase, membership.workspaceId);
  const [agents, models] = await Promise.all([
    loadProjectAgentOptions(
      supabase,
      membership.workspaceId,
      projects.map((project) => project.id),
    ),
    loadExecutableModels(supabase, membership.workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <Link
        href="/app/conversaciones"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        <ArrowLeft /> Volver a conversaciones
      </Link>
      <div className="mt-5">
        <div className="nexus-kicker">Nueva sesión</div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Iniciar conversación</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          La conversación queda aislada dentro del proyecto y utilizará sus reglas, tecnologías y agentes asignados.
        </p>
      </div>

      <FormMessage error={params.error} success={params.success} />

      {!projects.length ? (
        <section className="nexus-panel mt-7 rounded-2xl p-8 text-center text-sm text-slate-500">
          Primero crea un proyecto activo.
        </section>
      ) : (
        <div className="mt-7">
          <ConversationForm
            action={createConversation}
            projects={projects}
            agents={agents}
            models={models}
            initialProjectId={params.project}
          />
        </div>
      )}
    </div>
  );
}
