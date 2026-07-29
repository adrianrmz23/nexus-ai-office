import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FileCode2, GitCommitHorizontal, Plus, Search } from "lucide-react";

import { ArtifactCard } from "@/components/artifacts/artifact-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadArtifactList } from "@/modules/artifacts/application/artifact-queries";
import { ARTIFACT_STATUSES, ARTIFACT_STATUS_LABELS, type ArtifactStatus } from "@/modules/artifacts/domain/artifact";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Artefactos" };
type Props = { searchParams: Promise<{ project?: string; status?: string; q?: string }> };

export default async function ArtifactsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = ARTIFACT_STATUSES.includes(params.status as ArtifactStatus) ? (params.status as ArtifactStatus) : undefined;
  const { supabase, membership } = await requireCurrentWorkspace();
  const [artifacts, projects] = await Promise.all([
    loadArtifactList(supabase, membership.workspaceId, { projectId: params.project, status, query: params.q }),
    supabase.from("projects").select("id, name").eq("workspace_id", membership.workspaceId).neq("status", "archived").order("name"),
  ]);
  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="nexus-kicker">Entregables versionados</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Artefactos</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Conserva código, planes, migraciones, ADR y pruebas con historial, revisión humana y trazabilidad de agentes.</p></div><Link href="/app/artefactos/nuevo" className={buttonVariants({ size: "lg" })}><Plus />Nuevo artefacto</Link></div>
      <section className="mt-8 grid gap-3 sm:grid-cols-3"><article className="nexus-panel rounded-2xl p-5"><FileCode2 className="size-4 text-primary/70" /><div className="mt-4 text-2xl font-semibold text-white">{artifacts.length}</div><div className="mt-1 text-xs text-slate-600">Artefactos visibles</div></article><article className="nexus-panel rounded-2xl p-5"><CheckCircle2 className="size-4 text-emerald-300/70" /><div className="mt-4 text-2xl font-semibold text-white">{artifacts.filter((item) => item.status === "approved").length}</div><div className="mt-1 text-xs text-slate-600">Aprobados</div></article><article className="nexus-panel rounded-2xl p-5"><GitCommitHorizontal className="size-4 text-cyan-300/70" /><div className="mt-4 text-2xl font-semibold text-white">{artifacts.reduce((sum, item) => sum + item.current_version_number, 0)}</div><div className="mt-1 text-xs text-slate-600">Versiones acumuladas</div></article></section>
      <form className="nexus-panel mt-5 grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_16rem_16rem_auto]"><div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-slate-600" /><Input name="q" defaultValue={params.q} placeholder="Buscar artefacto..." className="pl-10" /></div><select name="project" defaultValue={params.project ?? ""} className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="">Todos los proyectos</option>{(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select name="status" defaultValue={params.status ?? ""} className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="">Estados activos</option>{ARTIFACT_STATUSES.map((value) => <option key={value} value={value}>{ARTIFACT_STATUS_LABELS[value]}</option>)}</select><button className={buttonVariants({ variant: "secondary" })}>Aplicar</button></form>
      {artifacts.length ? <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{artifacts.map((artifact) => <ArtifactCard key={artifact.id} artifact={artifact} />)}</section> : <section className="nexus-panel mt-5 grid min-h-72 place-items-center rounded-2xl p-8 text-center"><div><FileCode2 className="mx-auto size-8 text-slate-700" /><h2 className="mt-4 text-lg font-semibold text-slate-200">No hay artefactos para estos filtros</h2><p className="mt-2 text-sm text-slate-600">Guarda una respuesta de agente o crea un entregable manual.</p></div></section>}
    </div>
  );
}
