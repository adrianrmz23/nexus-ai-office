import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bug, Gavel } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { MessageMarkdown } from "@/components/conversations/message-markdown";
import { DecisionForm, ErrorSolutionForm } from "@/components/project-records/project-record-forms";
import { buttonVariants } from "@/components/ui/button";
import { loadProjectAgentAssignments } from "@/modules/agents/application/agent-queries";
import { createErrorSolution, createProjectDecision } from "@/modules/project-records/application/project-record-actions";
import { loadProjectRecords } from "@/modules/project-records/application/project-record-queries";
import { projectIdSchema } from "@/modules/projects/domain/project-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Registro técnico" };
type Props = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; success?: string; conversation?: string; message?: string; agent?: string }>;
};

export default async function ProjectRecordsPage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const query = await searchParams;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) return notFound();
  const { supabase, membership } = await requireCurrentWorkspace();
  const { data: project } = await supabase.from("projects").select("id, name, color").eq("workspace_id", membership.workspaceId).eq("id", parsed.data).maybeSingle();
  if (!project) return notFound();
  const [records, assignments] = await Promise.all([
    loadProjectRecords(supabase, membership.workspaceId, project.id),
    loadProjectAgentAssignments(supabase, membership.workspaceId, project.id),
  ]);
  const agents = assignments.map((assignment) => ({ id: assignment.agent_id, name: assignment.agent.name }));

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <Link href={`/app/proyectos/${project.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft />Volver al proyecto</Link>
      <div className="mt-5"><div className="nexus-kicker">Conocimiento operativo</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">Registro técnico de {project.name}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Conserva decisiones, causas raíz y soluciones verificadas para que los agentes no repitan errores ni contradigan la arquitectura aceptada.</p></div>
      <div className="mt-7"><FormMessage error={query.error} success={query.success} /></div>
      <section className="mt-5 grid gap-4 xl:grid-cols-2"><DecisionForm action={createProjectDecision} projectId={project.id} agents={agents} conversationId={query.conversation} sourceMessageId={query.message} agentId={query.agent} /><ErrorSolutionForm action={createErrorSolution} projectId={project.id} agents={agents} conversationId={query.conversation} sourceMessageId={query.message} agentId={query.agent} /></section>
      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><Gavel className="size-4 text-violet-300/70" /><div className="nexus-kicker">Decisiones</div></div><h2 className="mt-2 text-base font-semibold text-foreground">Historial arquitectónico</h2></div><span className="font-mono text-xs text-primary">{records.decisions.length}</span></div><div className="mt-5 space-y-3">{records.decisions.map((record) => <div key={record.id} className="rounded-xl border border-border bg-muted/45 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-foreground">{record.title}</h3><span className="rounded-full border border-border px-2 py-1 text-[0.58rem] text-muted-foreground">{record.status}</span></div><div className="mt-3"><MessageMarkdown content={record.decision} compact /></div>{record.agent ? <div className="mt-3 text-[0.62rem] text-muted-foreground/80">Registrada con {record.agent.name}</div> : null}</div>)}{!records.decisions.length ? <p className="text-sm text-muted-foreground/80">Todavía no hay decisiones registradas.</p> : null}</div></article>
        <article className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><Bug className="size-4 text-rose-300/70" /><div className="nexus-kicker">Errores y soluciones</div></div><h2 className="mt-2 text-base font-semibold text-foreground">Base de causas raíz</h2></div><span className="font-mono text-xs text-primary">{records.errors.length}</span></div><div className="mt-5 space-y-3">{records.errors.map((record) => <div key={record.id} className="rounded-xl border border-border bg-muted/45 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-foreground">{record.title}</h3><span className="rounded-full border border-border px-2 py-1 text-[0.58rem] text-muted-foreground">{record.status}</span></div>{record.error_signature ? <pre className="nexus-scrollbar mt-3 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-[0.65rem] text-rose-100/60">{record.error_signature}</pre> : null}<div className="mt-3"><MessageMarkdown content={record.solution} compact /></div>{record.agent ? <div className="mt-3 text-[0.62rem] text-muted-foreground/80">Registrado con {record.agent.name}</div> : null}</div>)}{!records.errors.length ? <p className="text-sm text-muted-foreground/80">Todavía no hay errores documentados.</p> : null}</div></article>
      </section>
    </div>
  );
}
