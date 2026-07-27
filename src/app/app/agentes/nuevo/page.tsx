import type { Metadata } from "next";

import { AgentForm } from "@/components/agents/agent-form";
import { createAgent } from "@/modules/agents/application/agent-actions";
import type { AgentRole, AgentStatus } from "@/modules/agents/domain/agent";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Nuevo agente" };

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function NewAgentPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const [technologiesResult, collaboratorsResult] = await Promise.all([
    supabase
      .from("technologies")
      .select("id, name, category, version, status, color")
      .eq("workspace_id", membership.workspaceId)
      .neq("status", "archived")
      .order("name"),
    supabase
      .from("agents")
      .select("id, name, role, status")
      .eq("workspace_id", membership.workspaceId)
      .neq("status", "archived")
      .order("name"),
  ]);

  return (
    <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
      <div className="nexus-kicker">Equipo especializado</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Crear agente</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        Configura un especialista reutilizable con instrucciones, tecnologías,
        permisos y colaboradores.
      </p>
      <div className="mt-8">
        <AgentForm
          action={createAgent}
          error={error}
          mode="create"
          technologies={(technologiesResult.data ?? []) as Array<{ id: string; name: string; category: string; version: string | null; status: "active" | "inactive" | "archived"; color: string }>}
          collaborators={(collaboratorsResult.data ?? []) as Array<{ id: string; name: string; role: AgentRole; status: AgentStatus }>}
        />
      </div>
    </div>
  );
}
