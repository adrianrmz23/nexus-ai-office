import type { Metadata } from "next";

import { ArtifactForm } from "@/components/artifacts/artifact-form";
import { createArtifact } from "@/modules/artifacts/application/artifact-actions";
import { loadArtifactFormOptions, loadSourceMessage } from "@/modules/artifacts/application/artifact-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Nuevo artefacto" };
type Props = { searchParams: Promise<{ project?: string; task?: string; conversation?: string; message?: string; error?: string }> };

function titleFromContent(content: string): string {
  const first = content.split("\n").map((line) => line.replace(/^#+\s*/, "").replace(/[*`]/g, "").trim()).find(Boolean) ?? "Artefacto desde conversación";
  return first.slice(0, 180);
}

export default async function NewArtifactPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const [options, source] = await Promise.all([
    loadArtifactFormOptions(supabase, membership.workspaceId),
    params.message ? loadSourceMessage(supabase, membership.workspaceId, params.message) : Promise.resolve(null),
  ]);
  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0"><div className="nexus-kicker">Nuevo entregable</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Crear artefacto</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">La primera versión se guarda de forma atómica y queda lista para revisión.</p><div className="mt-7"><ArtifactForm action={createArtifact} projects={options.projects} tasks={options.tasks} agents={options.agents} error={params.error} initialValues={{ projectId: source?.projectId ?? params.project ?? options.projects[0]?.id ?? "", title: source ? titleFromContent(source.content) : "", artifactType: source ? "documentation" : "code", language: source ? "markdown" : "", filePath: "", content: source?.content ?? "", changeSummary: source ? "Versión inicial creada desde una respuesta de agente." : "", taskId: params.task ?? "", conversationId: source?.conversationId ?? params.conversation ?? "", sourceMessageId: source?.id ?? "", createdByAgentId: source?.agentId ?? "" }} /></div></div>
  );
}
