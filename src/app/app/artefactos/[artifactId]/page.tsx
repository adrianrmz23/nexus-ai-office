import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, CircleDotDashed, FileClock, GitCompareArrows, MessageSquareWarning, Save } from "lucide-react";

import { DiffView } from "@/components/artifacts/diff-view";
import { FormMessage } from "@/components/auth/form-message";
import { MessageMarkdown } from "@/components/conversations/message-markdown";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { archiveArtifact, createArtifactVersion, reviewArtifact } from "@/modules/artifacts/application/artifact-actions";
import { loadArtifactById } from "@/modules/artifacts/application/artifact-queries";
import { ARTIFACT_STATUS_LABELS, ARTIFACT_TYPE_LABELS } from "@/modules/artifacts/domain/artifact";
import { artifactIdSchema } from "@/modules/artifacts/domain/artifact-schema";
import { computeLineDiff } from "@/modules/artifacts/domain/line-diff";
import { loadProjectAgentAssignments } from "@/modules/agents/application/agent-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Detalle de artefacto" };
type Props = { params: Promise<{ artifactId: string }>; searchParams: Promise<{ from?: string; to?: string; error?: string; success?: string }> };

export default async function ArtifactDetailPage({ params, searchParams }: Props) {
  const { artifactId } = await params;
  const query = await searchParams;
  const parsed = artifactIdSchema.safeParse(artifactId);
  if (!parsed.success) return notFound();
  const { supabase, membership } = await requireCurrentWorkspace();
  const result = await loadArtifactById(supabase, membership.workspaceId, parsed.data);
  if (!result) return notFound();
  const { artifact, versions } = result;
  const agents = await loadProjectAgentAssignments(supabase, membership.workspaceId, artifact.project_id);
  const current = versions.find((version) => version.version_number === artifact.current_version_number) ?? versions[0];
  const fromNumber = Number(query.from || Math.max(1, artifact.current_version_number - 1));
  const toNumber = Number(query.to || artifact.current_version_number);
  const fromVersion = versions.find((version) => version.version_number === fromNumber) ?? current;
  const toVersion = versions.find((version) => version.version_number === toNumber) ?? current;
  const diff = computeLineDiff(fromVersion?.content ?? "", toVersion?.content ?? "");

  return (
    <div className="mx-auto max-w-[96rem] pb-20 lg:pb-0">
      <Link href="/app/artefactos" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft />Volver a artefactos</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div><div className="nexus-kicker">{artifact.project?.name}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">{artifact.title}</h1><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2.5 py-1 text-primary/75">{ARTIFACT_TYPE_LABELS[artifact.artifact_type]}</span><span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{ARTIFACT_STATUS_LABELS[artifact.status]}</span><span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">v{artifact.current_version_number}</span>{artifact.file_path ? <span className="rounded-full border border-border px-2.5 py-1 font-mono text-muted-foreground">{artifact.file_path}</span> : null}</div></div>{artifact.status !== "archived" ? <form action={archiveArtifact}><input type="hidden" name="artifactId" value={artifact.id} /><ConfirmSubmitButton variant="ghost" confirmationMessage="¿Archivar este artefacto? Todas sus versiones se conservarán."><Archive />Archivar</ConfirmSubmitButton></form> : null}</div>
      <div className="mt-7"><FormMessage error={query.error} success={query.success} /></div>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Versión actual</div><div className="mt-4 nexus-scrollbar max-h-[48rem] overflow-auto rounded-xl border border-border bg-muted/60 p-4"><MessageMarkdown content={current?.content ?? "Sin contenido"} /></div></article>
        <aside className="space-y-4">
          <article className="nexus-panel rounded-2xl p-5"><div className="flex items-center gap-2"><FileClock className="size-4 text-primary/70" /><div className="nexus-kicker">Historial</div></div><div className="mt-4 space-y-2">{versions.map((version) => <div key={version.id} className="rounded-xl border border-border p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium text-foreground">Versión {version.version_number}</span><span className="text-[0.6rem] text-muted-foreground/80">{new Date(version.created_at).toLocaleDateString("es-MX")}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground/80">{version.change_summary || "Sin resumen"}</p></div>)}</div></article>
          {artifact.task ? <Link href={`/app/tareas/${artifact.task.id}`} className="nexus-panel block rounded-2xl p-5 hover:border-primary/20"><div className="nexus-kicker">Tarea relacionada</div><div className="mt-3 text-sm text-foreground">{artifact.task.title}</div></Link> : null}
          {artifact.conversation_id ? <Link href={`/app/conversaciones/${artifact.conversation_id}`} className="nexus-panel block rounded-2xl p-5 hover:border-primary/20"><div className="nexus-kicker">Procedencia</div><div className="mt-3 text-sm text-foreground">Abrir conversación</div></Link> : null}
        </aside>
      </section>

      {versions.length > 1 ? <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2"><GitCompareArrows className="size-4 text-primary/70" /><div className="nexus-kicker">Comparación</div></div><h2 className="mt-2 text-base font-semibold text-foreground">Diff entre versiones</h2></div><form className="flex flex-wrap items-end gap-2"><div><Label htmlFor="from">Desde</Label><select id="from" name="from" defaultValue={fromVersion?.version_number} className="mt-2 h-10 rounded-lg border border-input bg-card px-3 text-sm">{versions.map((version) => <option key={version.id} value={version.version_number}>v{version.version_number}</option>)}</select></div><div><Label htmlFor="to">Hasta</Label><select id="to" name="to" defaultValue={toVersion?.version_number} className="mt-2 h-10 rounded-lg border border-input bg-card px-3 text-sm">{versions.map((version) => <option key={version.id} value={version.version_number}>v{version.version_number}</option>)}</select></div><button className={buttonVariants({ variant: "secondary" })}>Comparar</button></form></div><div className="mt-5"><DiffView lines={diff} /></div></section> : null}

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <form action={createArtifactVersion} className="nexus-panel rounded-2xl p-5 sm:p-6"><input type="hidden" name="artifactId" value={artifact.id} /><input type="hidden" name="sourceMessageId" value="" /><input type="hidden" name="createdByAgentId" value="" /><div className="nexus-kicker">Nueva versión</div><h2 className="mt-2 text-base font-semibold text-foreground">Proponer cambios</h2><div className="mt-5 space-y-4"><div><Label htmlFor="changeSummary">Resumen del cambio</Label><Textarea id="changeSummary" name="changeSummary" className="mt-2 min-h-24" required /></div><div><Label htmlFor="versionContent">Contenido completo</Label><Textarea id="versionContent" name="content" defaultValue={current?.content} className="nexus-scrollbar mt-2 min-h-[28rem] font-mono text-xs leading-6" required /></div></div><div className="mt-5 flex justify-end"><FormSubmitButton pendingLabel="Creando versión..."><Save />Guardar nueva versión</FormSubmitButton></div></form>
        <form action={reviewArtifact} className="nexus-panel rounded-2xl p-5 sm:p-6"><input type="hidden" name="artifactId" value={artifact.id} /><div className="nexus-kicker">Revisión humana</div><h2 className="mt-2 text-base font-semibold text-foreground">Aceptar, rechazar o solicitar correcciones</h2><div className="mt-5 space-y-4"><div><Label htmlFor="reviewerAgentId">Agente revisor</Label><select id="reviewerAgentId" name="reviewerAgentId" defaultValue={artifact.reviewer_agent_id ?? ""} className="nexus-focus mt-2 h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"><option value="">Revisión humana</option>{agents.map((assignment) => <option key={assignment.agent_id} value={assignment.agent_id}>{assignment.agent.name}</option>)}</select></div><div><Label htmlFor="reviewNote">Notas de revisión</Label><Textarea id="reviewNote" name="reviewNote" defaultValue={artifact.review_note} className="mt-2 min-h-40" /></div><div><Label htmlFor="status">Resultado</Label><select id="status" name="status" defaultValue={artifact.status === "draft" ? "in_review" : artifact.status} className="nexus-focus mt-2 h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"><option value="in_review">Enviar a revisión</option><option value="changes_requested">Solicitar cambios</option><option value="approved">Aprobar</option><option value="rejected">Rechazar</option></select></div></div><div className="mt-5 flex flex-wrap justify-end gap-2"><FormSubmitButton variant="outline" pendingLabel="Registrando..."><CircleDotDashed />Registrar revisión</FormSubmitButton></div>{artifact.review_note ? <div className="mt-5 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-4 text-xs leading-6 text-amber-100/65"><MessageSquareWarning className="mb-2 size-4" />{artifact.review_note}</div> : null}</form>
      </section>
    </div>
  );
}
