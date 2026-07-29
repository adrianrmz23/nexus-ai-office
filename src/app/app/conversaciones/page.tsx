import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquarePlus, MessagesSquare, Search } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { ConversationCard } from "@/components/conversations/conversation-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadConversationList,
  loadConversationProjects,
} from "@/modules/conversations/application/conversation-queries";
import { setConversationStatus } from "@/modules/conversations/application/conversation-actions";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Conversaciones" };

type Props = {
  searchParams: Promise<{
    project?: string;
    status?: string;
    search?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function ConversationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const status = ["all", "active", "archived"].includes(params.status ?? "")
    ? params.status ?? "active"
    : "active";
  const search = params.search?.trim() ?? "";
  const [conversations, projects] = await Promise.all([
    loadConversationList(supabase, membership.workspaceId, {
      projectId: params.project || undefined,
      status,
      search: search || undefined,
    }),
    loadConversationProjects(supabase, membership.workspaceId),
  ]);

  const activeCount = conversations.filter((item) => item.status === "active").length;
  const teamCount = conversations.filter((item) => item.mode === "team").length;
  const messageCount = conversations.reduce(
    (sum, conversation) => sum + (conversation.messageCount ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="nexus-kicker">Centro de trabajo</div>
          <h1 className="mt-3 text-3xl font-semibold text-white">Conversaciones</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Trabaja con agentes y modelos reales conservando historial, adjuntos, tokens, costo y duración por ejecución.
          </p>
        </div>
        <Link href="/app/conversaciones/nueva" className={cn(buttonVariants({ size: "lg" }))}>
          <MessageSquarePlus /> Nueva conversación
        </Link>
      </div>

      <FormMessage error={params.error} success={params.success} />

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        {[
          ["Conversaciones activas", activeCount, "Sesiones disponibles"],
          ["Modo equipo", teamCount, "Coordinación mediante líder"],
          ["Mensajes visibles", messageCount, "Historial recuperado"],
        ].map(([label, value, description]) => (
          <article key={String(label)} className="nexus-panel rounded-2xl p-5">
            <div className="font-mono text-[0.62rem] tracking-[0.18em] text-slate-600 uppercase">
              {label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
            <div className="mt-2 text-xs text-slate-600">{description}</div>
          </article>
        ))}
      </section>

      <section className="nexus-panel mt-5 rounded-2xl p-4 sm:p-5">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem_13rem_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-600" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar conversación..."
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] pr-3 pl-10 text-sm text-foreground"
            />
          </label>
          <select
            name="project"
            defaultValue={params.project ?? ""}
            className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3 text-sm text-foreground"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3 text-sm text-foreground"
          >
            <option value="active">Activas</option>
            <option value="archived">Archivadas</option>
            <option value="all">Todos los estados</option>
          </select>
          <button className={buttonVariants({ variant: "secondary" })}>Aplicar filtros</button>
        </form>
      </section>

      {conversations.length ? (
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              statusAction={setConversationStatus}
            />
          ))}
        </section>
      ) : (
        <section className="nexus-panel mt-5 grid min-h-72 place-items-center rounded-2xl p-8 text-center">
          <div>
            <MessagesSquare className="mx-auto size-8 text-primary/40" />
            <h2 className="mt-4 text-lg font-semibold text-slate-200">
              No hay conversaciones para estos filtros
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Crea una sesión de trabajo vinculada a un proyecto, agente y modelo ejecutable.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
